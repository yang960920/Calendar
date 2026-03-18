"use server";

import { prisma } from "@/lib/prisma";
import { getContributionBreakdown } from "@/lib/contribution";

// ── 타입 정의 ──

export interface ReportPeriod {
    start: Date;
    end: Date;
    label: string;
    type: "WEEKLY" | "MONTHLY";
}

export interface ProjectSummary {
    name: string;
    progress: number;
    taskCount: number;
    completedCount: number;
}

export interface TopContributor {
    name: string;
    department: string;
    contribution: number;
    completedTasks: number;
}

export interface MemberReportData {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    delayedTasks: number;
    completionRate: number;
    contribution: number;
    tasks: TaskDetail[];
    categoryBreakdown: { category: string; count: number; rate: number }[];
    timelinessRate: number;
}

export interface DepartmentReportData {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    delayedTasks: number;
    completionRate: number;
    totalContribution: number;
    members: MemberReportData[];
    categoryBreakdown: { category: string; count: number; rate: number }[];
}

export interface CompanyReportData {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    delayedTasks: number;
    completionRate: number;
    totalContribution: number;
    projectSummaries: ProjectSummary[];
    topContributors: TopContributor[];
    weekOverWeek: { prevRate: number; currentRate: number; diff: number };
}

export interface TaskDetail {
    title: string;
    project: string;
    category: string;
    priority: string;
    status: string;
    dueDate: string;
    isDelayed: boolean;
    delayDays: number;
    subTaskProgress: string;
    contributionScore: number;
}

export interface CollectedReportData {
    period: ReportPeriod;
    company: CompanyReportData;
    departments: DepartmentReportData[];
}

// ── 데이터 수집 ──

export async function collectReportData(
    periodStart: Date,
    periodEnd: Date,
    type: "WEEKLY" | "MONTHLY"
): Promise<CollectedReportData> {
    // 기간 라벨 생성
    const label = type === "WEEKLY"
        ? formatWeekLabel(periodStart)
        : formatMonthLabel(periodStart);

    // 기간 내 업무 조회
    const tasks = await prisma.task.findMany({
        where: {
            OR: [
                { dueDate: { gte: periodStart, lte: periodEnd } },
                { createdAt: { gte: periodStart, lte: periodEnd } },
            ],
        },
        include: {
            assignee: { include: { department: true } },
            assignees: { include: { department: true } },
            project: true,
            subTasks: true,
        },
    });

    // 이전 기간 데이터 (전주/전월 대비)
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const prevStart = new Date(periodStart.getTime() - periodLength);
    const prevEnd = new Date(periodStart.getTime() - 1);

    const prevTasks = await prisma.task.findMany({
        where: {
            OR: [
                { dueDate: { gte: prevStart, lte: prevEnd } },
                { createdAt: { gte: prevStart, lte: prevEnd } },
            ],
        },
        select: { status: true },
    });

    const prevTotal = prevTasks.length;
    const prevDone = prevTasks.filter(t => t.status === "DONE").length;
    const prevRate = prevTotal > 0 ? Math.round((prevDone / prevTotal) * 100) : 0;

    // 부서/개인 그룹핑
    const deptMap = new Map<string, { id: string; name: string; tasks: typeof tasks }>();
    const memberMap = new Map<string, { id: string; name: string; deptId: string; deptName: string; tasks: typeof tasks }>();

    const today = new Date();

    for (const t of tasks) {
        const assigneeList = t.assignees && t.assignees.length > 0
            ? t.assignees
            : t.assignee ? [t.assignee] : [];

        for (const user of assigneeList) {
            const deptName = user.department?.name || "미지정";
            const deptId = user.department?.id || "none";

            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, { id: deptId, name: deptName, tasks: [] });
            }
            deptMap.get(deptName)!.tasks.push(t);

            if (!memberMap.has(user.id)) {
                memberMap.set(user.id, { id: user.id, name: user.name, deptId, deptName, tasks: [] });
            }
            memberMap.get(user.id)!.tasks.push(t);
        }
    }

    // Company 데이터
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "DONE").length;
    const inProgressTasks = tasks.filter(t => t.status === "IN_PROGRESS").length;
    const delayedTasks = tasks.filter(t => {
        if (!t.endDate || t.status === "DONE") return false;
        return new Date(t.endDate) < today;
    }).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let totalContribution = 0;
    tasks.forEach(t => { totalContribution += (t.contributionScore || 0); });

    // 프로젝트 요약
    const projectMap = new Map<string, ProjectSummary>();
    tasks.forEach(t => {
        if (!t.project) return;
        const key = t.project.id;
        if (!projectMap.has(key)) {
            projectMap.set(key, { name: t.project.name, progress: 0, taskCount: 0, completedCount: 0 });
        }
        const p = projectMap.get(key)!;
        p.taskCount++;
        if (t.status === "DONE") p.completedCount++;
        p.progress = Math.round((p.completedCount / p.taskCount) * 100);
    });

    // Top 5 기여자
    const contributorMap = new Map<string, TopContributor>();
    for (const [userId, m] of memberMap) {
        let contri = 0;
        let completed = 0;
        m.tasks.forEach(t => {
            if (t.status === "DONE") {
                contri += (t.contributionScore || 0);
                completed++;
            }
        });
        contributorMap.set(userId, {
            name: m.name,
            department: m.deptName,
            contribution: contri,
            completedTasks: completed,
        });
    }

    // 부서별 데이터
    const departments: DepartmentReportData[] = [];
    for (const [deptName, dept] of deptMap) {
        const deptTasks = dept.tasks;
        const completed = deptTasks.filter(t => t.status === "DONE").length;
        const delayed = deptTasks.filter(t => !t.endDate ? false : t.status !== "DONE" && new Date(t.endDate) < today).length;

        let deptContri = 0;
        deptTasks.forEach(t => { deptContri += (t.contributionScore || 0); });

        // 카테고리
        const catMap = new Map<string, { count: number; done: number }>();
        deptTasks.forEach(t => {
            const cat = (t as any).project?.category || "기타";
            if (!catMap.has(cat)) catMap.set(cat, { count: 0, done: 0 });
            catMap.get(cat)!.count++;
            if (t.status === "DONE") catMap.get(cat)!.done++;
        });

        // 소속 직원
        const members: MemberReportData[] = [];
        for (const [userId, m] of memberMap) {
            if (m.deptName !== deptName) continue;
            const mTasks = m.tasks;
            const mCompleted = mTasks.filter(t => t.status === "DONE").length;
            const mDelayed = mTasks.filter(t => !t.endDate ? false : t.status !== "DONE" && new Date(t.endDate) < today).length;
            let mContri = 0;
            mTasks.forEach(t => { mContri += (t.contributionScore || 0); });

            // 기한 준수율
            const tasksWithEnd = mTasks.filter(t => t.endDate && t.status === "DONE" && t.completedAt);
            const onTime = tasksWithEnd.filter(t => new Date(t.completedAt!) <= new Date(t.endDate!)).length;
            const timelinessRate = tasksWithEnd.length > 0 ? Math.round((onTime / tasksWithEnd.length) * 100) : 100;

            // 카테고리
            const mCatMap = new Map<string, { count: number; done: number }>();
            mTasks.forEach(t => {
                const cat = (t as any).project?.category || "기타";
                if (!mCatMap.has(cat)) mCatMap.set(cat, { count: 0, done: 0 });
                mCatMap.get(cat)!.count++;
                if (t.status === "DONE") mCatMap.get(cat)!.done++;
            });

            // 업무 상세
            const taskDetails: TaskDetail[] = mTasks.map(t => {
                const isDelayed = !!(t.endDate && t.status !== "DONE" && new Date(t.endDate) < today);
                const delayDays = isDelayed && t.endDate
                    ? Math.floor((today.getTime() - new Date(t.endDate).getTime()) / 86400000)
                    : 0;
                const subCompleted = t.subTasks?.filter(s => s.isCompleted).length || 0;
                const subTotal = t.subTasks?.length || 0;

                return {
                    title: t.title,
                    project: t.project?.name || "개인",
                    category: t.project?.category || "기타",
                    priority: t.priority || "보통",
                    status: t.status === "DONE" ? "완료" : t.status === "IN_PROGRESS" ? "진행중" : "대기",
                    dueDate: t.endDate ? t.endDate.toISOString().slice(0, 10) : "-",
                    isDelayed,
                    delayDays,
                    subTaskProgress: subTotal > 0 ? `${subCompleted}/${subTotal}` : "-",
                    contributionScore: t.contributionScore || 0,
                };
            });

            members.push({
                id: userId,
                name: m.name,
                totalTasks: mTasks.length,
                completedTasks: mCompleted,
                delayedTasks: mDelayed,
                completionRate: mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0,
                contribution: mContri,
                tasks: taskDetails,
                categoryBreakdown: Array.from(mCatMap.entries()).map(([cat, v]) => ({
                    category: cat, count: v.count, rate: v.count > 0 ? Math.round((v.done / v.count) * 100) : 0,
                })),
                timelinessRate,
            });
        }

        members.sort((a, b) => b.contribution - a.contribution);

        departments.push({
            id: dept.id,
            name: deptName,
            totalTasks: deptTasks.length,
            completedTasks: completed,
            delayedTasks: delayed,
            completionRate: deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0,
            totalContribution: deptContri,
            members,
            categoryBreakdown: Array.from(catMap.entries()).map(([cat, v]) => ({
                category: cat, count: v.count, rate: v.count > 0 ? Math.round((v.done / v.count) * 100) : 0,
            })),
        });
    }

    departments.sort((a, b) => b.completionRate - a.completionRate);

    return {
        period: { start: periodStart, end: periodEnd, label, type },
        company: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            delayedTasks,
            completionRate,
            totalContribution,
            projectSummaries: Array.from(projectMap.values()),
            topContributors: Array.from(contributorMap.values())
                .sort((a, b) => b.contribution - a.contribution)
                .slice(0, 5),
            weekOverWeek: {
                prevRate,
                currentRate: completionRate,
                diff: completionRate - prevRate,
            },
        },
        departments,
    };
}

// ── 유틸 ──

function formatWeekLabel(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const weekNum = Math.ceil(date.getDate() / 7);
    return `${y}년 ${m}월 ${weekNum}주차`;
}

function formatMonthLabel(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return `${y}년 ${m}월`;
}

export function getWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const day = now.getDay(); // 0=일, 1=월...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    return { start: monday, end: friday };
}

export function getLastMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
}

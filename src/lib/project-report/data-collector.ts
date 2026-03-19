import { prisma } from "@/lib/prisma";
import { getContributionBreakdown } from "@/lib/contribution";

// ── 타입 정의 ──

export interface ProjectReportData {
    project: {
        id: string;
        name: string;
        category: string;
        description: string | null;
        startDate: string;
        endDate: string;
        durationDays: number;
        isOverdue: boolean;
        creator: { id: string; name: string; department: string };
    };
    participants: { id: string; name: string; department: string; role: string }[];
    taskStats: {
        total: number;
        completed: number;
        inProgress: number;
        todo: number;
        delayed: number;
        completionRate: number;
        onTimeRate: number;
        totalContribution: number;
        byCategory: { category: string; total: number; completed: number; rate: number }[];
        byPriority: { priority: string; total: number; completed: number; rate: number }[];
    };
    memberPerformance: MemberPerformance[];
    peerReview: {
        participationRate: number;
        memberScores: { userId: string; name: string; avgScore: number; reviewCount: number }[];
        unreviewed: string[];
    };
    compositeScores: CompositeScore[];
    timeline: { date: string; events: { time: string; action: string; userName: string; detail: string }[] }[];
    delayedTasks: { title: string; assignee: string; dueDate: string; delayDays: number }[];
}

export interface MemberPerformance {
    userId: string;
    name: string;
    department: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    onTimeTasks: number;
    onTimeRate: number;
    totalContribution: number;
    contributionRank: number;
}

export interface CompositeScore {
    userId: string;
    name: string;
    department: string;
    normalizedContribution: number;
    normalizedPeerReview: number;
    onTimeRate: number;
    compositeScore: number;
    grade: string;
}

function diffDays(start: Date, end: Date): number {
    const msPerDay = 86400000;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(0, 0, 0, 0);
    return Math.round((e.getTime() - s.getTime()) / msPerDay);
}

function getGrade(score: number): string {
    if (score >= 90) return "S";
    if (score >= 75) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    return "D";
}

// ── 데이터 수집 ──

export async function collectProjectReportData(projectId: string): Promise<ProjectReportData> {
    const project = await prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: {
            creator: { include: { department: true } },
            participants: { include: { department: true } },
            tasks: {
                include: {
                    assignee: { include: { department: true } },
                    assignees: { include: { department: true } },
                    subTasks: true,
                },
            },
            peerReviews: { include: { reviewer: true, reviewee: true } },
            activityLogs: {
                include: { user: true },
                orderBy: { createdAt: "asc" },
                take: 200,
            },
        },
    });

    const now = new Date();
    const durationDays = diffDays(project.startDate, project.endDate);
    const isOverdue = project.endDate < now;

    // 모든 참여자 (creator + participants 중복 제거)
    const allMemberMap = new Map<string, { id: string; name: string; department: string; role: string }>();
    allMemberMap.set(project.creator.id, {
        id: project.creator.id,
        name: project.creator.name,
        department: project.creator.department?.name || "미지정",
        role: "Creator",
    });
    for (const p of project.participants) {
        if (!allMemberMap.has(p.id)) {
            allMemberMap.set(p.id, {
                id: p.id,
                name: p.name,
                department: p.department?.name || "미지정",
                role: "Participant",
            });
        }
    }
    const participants = Array.from(allMemberMap.values());

    // ── 업무 통계 ──
    const tasks = project.tasks;
    const completed = tasks.filter(t => t.status === "DONE");
    const delayed = tasks.filter(t => {
        if (t.status === "DONE" && t.completedAt && t.endDate) {
            return t.completedAt > t.endDate;
        }
        if (t.status !== "DONE" && t.endDate && t.endDate < now) return true;
        return false;
    });

    const onTimeTasks = completed.filter(t => {
        if (!t.endDate || !t.completedAt) return true;
        return t.completedAt <= t.endDate;
    });

    const totalContribution = tasks.reduce((sum, t) => sum + (t.contributionScore || 0), 0);

    // 카테고리별
    const catMap = new Map<string, { total: number; completed: number }>();
    for (const t of tasks) {
        const cat = project.category || "기타";
        const entry = catMap.get(cat) || { total: 0, completed: 0 };
        entry.total++;
        if (t.status === "DONE") entry.completed++;
        catMap.set(cat, entry);
    }

    // 우선순위별
    const prioMap = new Map<string, { total: number; completed: number }>();
    for (const t of tasks) {
        const p = t.priority || "MEDIUM";
        const label = p === "HIGH" ? "높음" : p === "LOW" ? "낮음" : "보통";
        const entry = prioMap.get(label) || { total: 0, completed: 0 };
        entry.total++;
        if (t.status === "DONE") entry.completed++;
        prioMap.set(label, entry);
    }

    // ── 개인별 성과 ──
    const memberPerfMap = new Map<string, {
        totalTasks: number; completedTasks: number; onTimeTasks: number; totalContribution: number;
    }>();

    for (const t of tasks) {
        const assigneeIds: string[] = [];
        if (t.assigneeId) assigneeIds.push(t.assigneeId);
        for (const a of t.assignees) {
            if (!assigneeIds.includes(a.id)) assigneeIds.push(a.id);
        }

        for (const aid of assigneeIds) {
            const entry = memberPerfMap.get(aid) || { totalTasks: 0, completedTasks: 0, onTimeTasks: 0, totalContribution: 0 };
            entry.totalTasks++;
            if (t.status === "DONE") {
                entry.completedTasks++;
                if (!t.endDate || !t.completedAt || t.completedAt <= t.endDate) {
                    entry.onTimeTasks++;
                }
            }
            entry.totalContribution += (t.contributionScore || 0) / Math.max(assigneeIds.length, 1);
            memberPerfMap.set(aid, entry);
        }
    }

    const maxContribution = Math.max(...Array.from(memberPerfMap.values()).map(m => m.totalContribution), 1);

    const memberPerformance: MemberPerformance[] = participants.map(p => {
        const perf = memberPerfMap.get(p.id) || { totalTasks: 0, completedTasks: 0, onTimeTasks: 0, totalContribution: 0 };
        return {
            userId: p.id,
            name: p.name,
            department: p.department,
            totalTasks: perf.totalTasks,
            completedTasks: perf.completedTasks,
            completionRate: perf.totalTasks > 0 ? Math.round((perf.completedTasks / perf.totalTasks) * 100) : 0,
            onTimeTasks: perf.onTimeTasks,
            onTimeRate: perf.completedTasks > 0 ? Math.round((perf.onTimeTasks / perf.completedTasks) * 100) : 100,
            totalContribution: Math.round(perf.totalContribution),
            contributionRank: 0,
        };
    }).sort((a, b) => b.totalContribution - a.totalContribution);

    memberPerformance.forEach((m, i) => { m.contributionRank = i + 1; });

    // ── 피어 리뷰 ──
    const reviews = project.peerReviews;
    const revieweeMap = new Map<string, { name: string; scores: number[] }>();
    for (const r of reviews) {
        const entry = revieweeMap.get(r.revieweeId) || { name: r.reviewee.name, scores: [] };
        entry.scores.push(r.score);
        revieweeMap.set(r.revieweeId, entry);
    }

    const memberScores = Array.from(revieweeMap.entries()).map(([userId, { name, scores }]) => ({
        userId,
        name,
        avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        reviewCount: scores.length,
    }));

    const reviewerIds = new Set(reviews.map(r => r.reviewerId));
    const unreviewed = participants.filter(p => !reviewerIds.has(p.id)).map(p => p.name);
    const participationRate = participants.length > 0 ? Math.round((reviewerIds.size / participants.length) * 100) : 0;

    // ── 종합점수 ──
    const compositeScores: CompositeScore[] = participants.map(p => {
        const perf = memberPerfMap.get(p.id) || { totalTasks: 0, completedTasks: 0, onTimeTasks: 0, totalContribution: 0 };
        const reviewData = revieweeMap.get(p.id);
        const avgReview = reviewData ? reviewData.scores.reduce((a, b) => a + b, 0) / reviewData.scores.length : 3;

        const nc = (perf.totalContribution / maxContribution) * 100;
        const nr = (avgReview / 5) * 100;
        const otr = perf.completedTasks > 0 ? (perf.onTimeTasks / perf.completedTasks) * 100 : 100;
        const score = Math.round(nc * 0.5 + nr * 0.3 + otr * 0.2);

        return {
            userId: p.id,
            name: p.name,
            department: p.department,
            normalizedContribution: Math.round(nc),
            normalizedPeerReview: Math.round(nr),
            onTimeRate: Math.round(otr),
            compositeScore: score,
            grade: getGrade(score),
        };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    // ── 타임라인 ──
    const logsByDate = new Map<string, { time: string; action: string; userName: string; detail: string }[]>();
    for (const log of project.activityLogs) {
        const dateKey = log.createdAt.toISOString().slice(0, 10);
        const entry = logsByDate.get(dateKey) || [];
        entry.push({
            time: log.createdAt.toISOString().slice(11, 16),
            action: log.action,
            userName: log.user.name,
            detail: log.details || "",
        });
        logsByDate.set(dateKey, entry);
    }
    const timeline = Array.from(logsByDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, events]) => ({ date, events }));

    // ── 지연 업무 ──
    const delayedTasks = delayed.map(t => {
        const assigneeName = t.assignee?.name || t.assignees.map(a => a.name).join(", ") || "미지정";
        const dueDate = t.endDate ? t.endDate.toISOString().slice(0, 10) : "-";
        const dd = t.endDate ? diffDays(t.endDate, t.completedAt || now) : 0;
        return {
            title: t.title,
            assignee: assigneeName,
            dueDate,
            delayDays: Math.max(dd, 0),
        };
    });

    return {
        project: {
            id: project.id,
            name: project.name,
            category: project.category,
            description: project.description,
            startDate: project.startDate.toISOString().slice(0, 10),
            endDate: project.endDate.toISOString().slice(0, 10),
            durationDays,
            isOverdue,
            creator: {
                id: project.creator.id,
                name: project.creator.name,
                department: project.creator.department?.name || "미지정",
            },
        },
        participants,
        taskStats: {
            total: tasks.length,
            completed: completed.length,
            inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
            todo: tasks.filter(t => t.status === "TODO").length,
            delayed: delayed.length,
            completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
            onTimeRate: completed.length > 0 ? Math.round((onTimeTasks.length / completed.length) * 100) : 100,
            totalContribution: Math.round(totalContribution),
            byCategory: Array.from(catMap.entries()).map(([category, v]) => ({
                category, total: v.total, completed: v.completed,
                rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
            })),
            byPriority: Array.from(prioMap.entries()).map(([priority, v]) => ({
                priority, total: v.total, completed: v.completed,
                rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
            })),
        },
        memberPerformance,
        peerReview: { participationRate, memberScores, unreviewed },
        compositeScores,
        timeline,
        delayedTasks,
    };
}

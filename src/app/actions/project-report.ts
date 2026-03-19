"use server";

import { prisma } from "@/lib/prisma";
import { generateProjectReport } from "@/lib/project-report/generator";

// ═══════════════════════════════════════════
// Creator용 API (originalUrl 필드 절대 노출 금지)
// ═══════════════════════════════════════════

export async function getProjectReportForCreator(projectId: string, userId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { creatorId: true },
        });
        if (!project || project.creatorId !== userId) {
            return { success: false, error: "접근 권한이 없습니다." };
        }

        const report = await prisma.projectReport.findUnique({
            where: { projectId },
        });

        if (!report) {
            return { success: true, data: null };
        }

        // CRITICAL: originalUrl 제거, creatorUrl → pdfUrl로 변환
        return {
            success: true,
            data: {
                id: report.id,
                pdfUrl: report.creatorUrl,
                pdfFilename: report.creatorFilename,
                status: report.status,
                generatedAt: report.generatedAt.toISOString(),
                isSubmitted: !!report.revisedUrl,
                submittedAt: report.revisedAt?.toISOString() || null,
            },
        };
    } catch (error) {
        console.error("getProjectReportForCreator error:", error);
        return { success: false, error: "보고서 조회에 실패했습니다." };
    }
}

export async function generateProjectReportForCreator(projectId: string, userId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { creatorId: true },
        });
        if (!project || project.creatorId !== userId) {
            return { success: false, error: "접근 권한이 없습니다." };
        }

        const result = await generateProjectReport(projectId, userId);
        return result;
    } catch (error) {
        console.error("generateProjectReportForCreator error:", error);
        return { success: false, error: "보고서 생성에 실패했습니다." };
    }
}

// ═══════════════════════════════════════════
// Admin용 API (모든 정보 접근 가능)
// ═══════════════════════════════════════════

export async function getAllProjectReportsForAdmin() {
    try {
        const reports = await prisma.projectReport.findMany({
            include: {
                project: {
                    include: {
                        creator: { select: { name: true } },
                    },
                },
            },
            orderBy: { generatedAt: "desc" },
        });

        return {
            success: true,
            data: reports.map(r => ({
                id: r.id,
                projectId: r.projectId,
                projectName: r.project.name,
                category: r.project.category,
                creatorName: r.project.creator.name,
                startDate: r.project.startDate.toISOString().slice(0, 10),
                endDate: r.project.endDate.toISOString().slice(0, 10),
                originalUrl: r.originalUrl,
                originalFilename: r.originalFilename,
                creatorUrl: r.creatorUrl,
                revisedUrl: r.revisedUrl,
                revisedFilename: r.revisedFilename,
                revisedAt: r.revisedAt?.toISOString() || null,
                revisedComment: r.revisedComment,
                status: r.status,
                stats: r.stats as Record<string, any>,
                generatedAt: r.generatedAt.toISOString(),
                generatedBy: r.generatedBy,
            })),
        };
    } catch (error) {
        console.error("getAllProjectReportsForAdmin error:", error);
        return { success: false, error: "보고서 목록 조회에 실패했습니다." };
    }
}

export async function confirmProjectReport(reportId: string) {
    try {
        await prisma.projectReport.update({
            where: { id: reportId },
            data: { status: "CONFIRMED" },
        });
        return { success: true };
    } catch (error) {
        console.error("confirmProjectReport error:", error);
        return { success: false, error: "확인 처리에 실패했습니다." };
    }
}

export async function generateProjectReportManual(projectId: string) {
    try {
        const result = await generateProjectReport(projectId, "ADMIN");
        return result;
    } catch (error) {
        console.error("generateProjectReportManual error:", error);
        return { success: false, error: "보고서 생성에 실패했습니다." };
    }
}

export async function regenerateProjectReport(projectId: string) {
    try {
        const result = await generateProjectReport(projectId, "ADMIN");
        return result;
    } catch (error) {
        console.error("regenerateProjectReport error:", error);
        return { success: false, error: "재생성에 실패했습니다." };
    }
}

// ═══════════════════════════════════════════
// Cron용: 미생성 프로젝트 자동 감지 & 생성
// ═══════════════════════════════════════════

export async function generatePendingProjectReports() {
    const now = new Date();
    const sixDaysAgo = new Date(now);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    // 종료 후 6일 이상 경과 & 보고서 미생성 프로젝트
    const pendingProjects = await prisma.project.findMany({
        where: {
            endDate: { lte: sixDaysAgo },
            status: { in: ["COMPLETED", "CANCELLED"] },
            projectReport: null,
        },
        select: { id: true, name: true },
    });

    let generated = 0;
    let failed = 0;

    for (const project of pendingProjects) {
        try {
            const result = await generateProjectReport(project.id, "SYSTEM");
            if (result.success) {
                generated++;
                console.log(`[Cron] Generated report for: ${project.name}`);
            } else {
                failed++;
                console.error(`[Cron] Failed for ${project.name}:`, result.error);
            }
        } catch (error) {
            failed++;
            console.error(`[Cron] Error for ${project.name}:`, error);
        }
    }

    return { generated, failed, total: pendingProjects.length };
}

// ═══════════════════════════════════════════
// Admin용: 미생성 프로젝트 목록
// ═══════════════════════════════════════════

export async function getUnreportedProjects() {
    try {
        const projects = await prisma.project.findMany({
            where: {
                status: { in: ["COMPLETED", "CANCELLED"] },
                projectReport: null,
            },
            select: {
                id: true,
                name: true,
                endDate: true,
                creator: { select: { name: true } },
            },
            orderBy: { endDate: "desc" },
        });

        return {
            success: true,
            data: projects.map(p => ({
                id: p.id,
                name: p.name,
                endDate: p.endDate.toISOString().slice(0, 10),
                creatorName: p.creator.name,
            })),
        };
    } catch (error) {
        console.error("getUnreportedProjects error:", error);
        return { success: false, error: "미생성 프로젝트 조회에 실패했습니다." };
    }
}

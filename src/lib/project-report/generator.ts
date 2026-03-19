import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { collectProjectReportData } from "./data-collector";
import { generateProjectRetrospective } from "./ai-retrospective";
import { ProjectReportPDF } from "./pdf-template";

export async function generateProjectReport(
    projectId: string,
    generatedBy: string = "SYSTEM"
): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
        // 1. 생성 상태 표시 (upsert로 기존 레코드 있으면 status만 갱신)
        const existing = await prisma.projectReport.findUnique({ where: { projectId } });

        // 2. 데이터 수집
        const data = await collectProjectReportData(projectId);

        // 3. AI 회고 생성
        const insight = await generateProjectRetrospective(data);

        // 4. PDF 렌더링
        const pdfBuffer = await renderToBuffer(
            React.createElement(ProjectReportPDF, { data, insight }) as any
        );

        // 5. 파일명 생성
        const safeName = data.project.name.replace(/[^가-힣a-zA-Z0-9]/g, "_").substring(0, 30);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const originalFilename = `[관리자]_한미르_${safeName}_성과보고서_${dateStr}.pdf`;
        const creatorFilename = `한미르_${safeName}_성과보고서_${dateStr}.pdf`;

        // 6. 이중 업로드 (동일 Buffer, 다른 경로)
        const [originalBlob, creatorBlob] = await Promise.all([
            put(`reports/originals/${projectId}/${originalFilename}`, pdfBuffer, {
                access: "public",
                contentType: "application/pdf",
            }),
            put(`reports/projects/${projectId}/${creatorFilename}`, pdfBuffer, {
                access: "public",
                contentType: "application/pdf",
            }),
        ]);

        // 7. Stats 스냅샷 (JSON으로 저장)
        const stats = {
            totalTasks: data.taskStats.total,
            completedTasks: data.taskStats.completed,
            completionRate: data.taskStats.completionRate,
            onTimeRate: data.taskStats.onTimeRate,
            totalContribution: data.taskStats.totalContribution,
            delayedTasks: data.taskStats.delayed,
            participantCount: data.participants.length,
            peerReviewRate: data.peerReview.participationRate,
            topGrade: data.compositeScores[0]?.grade || "-",
        };

        // 8. DB 저장 (upsert — 재생성 시 원본/Creator URL만 갱신, 수정본 유지)
        const report = await prisma.projectReport.upsert({
            where: { projectId },
            create: {
                projectId,
                originalUrl: originalBlob.url,
                originalFilename,
                creatorUrl: creatorBlob.url,
                creatorFilename,
                status: "GENERATED",
                aiInsight: insight,
                stats,
                generatedBy,
            },
            update: {
                originalUrl: originalBlob.url,
                originalFilename,
                creatorUrl: creatorBlob.url,
                creatorFilename,
                aiInsight: insight,
                stats,
                generatedBy,
                generatedAt: new Date(),
                // 재생성 시 status는 수정본이 있으면 유지, 없으면 GENERATED
                status: existing?.revisedUrl ? existing.status : "GENERATED",
            },
        });

        return { success: true, reportId: report.id };
    } catch (error: any) {
        console.error(`[ProjectReport] Generation failed for ${projectId}:`, error);
        return { success: false, error: error?.message || "보고서 생성에 실패했습니다." };
    }
}

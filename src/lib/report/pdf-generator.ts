import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { collectReportData, getWeekRange, getLastMonthRange } from "./data-collector";
import type { CollectedReportData } from "./data-collector";
import {
    generateCompanyInsight,
    generateDepartmentInsight,
    generateIndividualInsight,
    generateInsightsBatch,
} from "./ai-insight";
import { CompanyReport } from "./pdf-templates/CompanyReport";
import { DepartmentReport } from "./pdf-templates/DepartmentReport";
import { IndividualReport } from "./pdf-templates/IndividualReport";

interface GeneratedPDF {
    buffer: Buffer;
    filename: string;
    scope: "COMPANY" | "DEPARTMENT" | "INDIVIDUAL";
    scopeLabel: string;
    departmentId?: string;
    userId?: string;
    aiInsight: string;
    stats: any;
}

function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "_");
}

function getFilenameSuffix(type: "WEEKLY" | "MONTHLY", periodStart: Date): string {
    const y = periodStart.getFullYear();
    const m = String(periodStart.getMonth() + 1).padStart(2, "0");
    if (type === "WEEKLY") {
        const w = Math.ceil(periodStart.getDate() / 7);
        return `${y}-${m}-W${w}`;
    }
    return `${y}-${m}`;
}

export async function generateReportPDFs(
    type: "WEEKLY" | "MONTHLY",
    periodStart?: Date,
): Promise<{ reportSetId: string }> {
    // 1. 기간 결정
    let start: Date, end: Date;
    if (periodStart) {
        start = periodStart;
        if (type === "WEEKLY") {
            end = new Date(start);
            end.setDate(start.getDate() + 4);
            end.setHours(23, 59, 59, 999);
        } else {
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        }
    } else {
        if (type === "WEEKLY") {
            const range = getWeekRange();
            start = range.start;
            end = range.end;
        } else {
            const range = getLastMonthRange();
            start = range.start;
            end = range.end;
        }
    }

    // 2. 데이터 수집
    const data = await collectReportData(start, end, type);

    // 3. ReportSet 생성
    const reportSet = await (prisma as any).reportSet.create({
        data: {
            type,
            periodStart: start,
            periodEnd: end,
            periodLabel: data.period.label,
            status: "GENERATING",
        },
    });

    try {
        const suffix = getFilenameSuffix(type, start);
        const typeLabel = type === "WEEKLY" ? "주간리포트" : "월간리포트";
        const pdfs: GeneratedPDF[] = [];

        // 4. AI 인사이트 생성 (병렬, 에러 격리)
        const companyInsight = await generateCompanyInsight(data.company, data.period.label);

        const deptInsights = new Map<string, string>();
        for (const dept of data.departments) {
            const insight = await generateDepartmentInsight(dept, data.period.label);
            deptInsights.set(dept.name, insight);
        }

        const memberInsights = new Map<string, string>();
        for (const dept of data.departments) {
            for (const m of dept.members) {
                const insight = await generateIndividualInsight(m, data.period.label);
                memberInsights.set(m.id, insight);
            }
        }

        // 5. 전사 PDF 생성
        const companyBuffer = await renderToBuffer(
            React.createElement(CompanyReport, {
                data: data.company,
                departments: data.departments,
                period: data.period,
                insight: companyInsight,
            }) as any
        );
        pdfs.push({
            buffer: Buffer.from(companyBuffer),
            filename: `한미르_${typeLabel}_${suffix}.pdf`,
            scope: "COMPANY",
            scopeLabel: "전사 종합",
            aiInsight: companyInsight,
            stats: {
                totalTasks: data.company.totalTasks,
                completionRate: data.company.completionRate,
                delayedTasks: data.company.delayedTasks,
            },
        });

        // 6. 부서별 PDF 생성
        for (const dept of data.departments) {
            const insight = deptInsights.get(dept.name) || "";
            const deptBuffer = await renderToBuffer(
                React.createElement(DepartmentReport, {
                    data: dept,
                    period: data.period,
                    insight,
                }) as any
            );
            pdfs.push({
                buffer: Buffer.from(deptBuffer),
                filename: `한미르_${sanitizeFilename(dept.name)}_${typeLabel}_${suffix}.pdf`,
                scope: "DEPARTMENT",
                scopeLabel: dept.name,
                departmentId: dept.id,
                aiInsight: insight,
                stats: { totalTasks: dept.totalTasks, completionRate: dept.completionRate },
            });
        }

        // 7. 개인별 PDF 생성
        for (const dept of data.departments) {
            for (const member of dept.members) {
                const insight = memberInsights.get(member.id) || "";
                const memberBuffer = await renderToBuffer(
                    React.createElement(IndividualReport, {
                        data: member,
                        departmentName: dept.name,
                        period: data.period,
                        insight,
                    }) as any
                );
                pdfs.push({
                    buffer: Buffer.from(memberBuffer),
                    filename: `한미르_${sanitizeFilename(member.name)}_${typeLabel}_${suffix}.pdf`,
                    scope: "INDIVIDUAL",
                    scopeLabel: member.name,
                    departmentId: dept.id,
                    userId: member.id,
                    aiInsight: insight,
                    stats: { totalTasks: member.totalTasks, completionRate: member.completionRate, contribution: member.contribution },
                });
            }
        }

        // 8. Vercel Blob에 업로드 + DB 저장
        for (const pdf of pdfs) {
            let pdfUrl: string | null = null;
            try {
                const blob = await put(
                    `reports/${reportSet.id}/${pdf.filename}`,
                    pdf.buffer,
                    { access: "public", contentType: "application/pdf" }
                );
                pdfUrl = blob.url;
            } catch (err) {
                console.error(`[PDF] Blob upload failed for ${pdf.filename}:`, err);
            }

            await (prisma as any).report.create({
                data: {
                    reportSetId: reportSet.id,
                    scope: pdf.scope,
                    scopeLabel: pdf.scopeLabel,
                    departmentId: pdf.departmentId || null,
                    userId: pdf.userId || null,
                    pdfUrl,
                    aiInsight: pdf.aiInsight,
                    stats: pdf.stats,
                },
            });
        }

        // 9. 상태 업데이트
        await (prisma as any).reportSet.update({
            where: { id: reportSet.id },
            data: {
                status: "GENERATED",
                stats: {
                    totalTasks: data.company.totalTasks,
                    completionRate: data.company.completionRate,
                    delayedTasks: data.company.delayedTasks,
                    totalContribution: data.company.totalContribution,
                    reportCount: pdfs.length,
                },
            },
        });

        return { reportSetId: reportSet.id };
    } catch (error: any) {
        console.error("[ReportGenerator] Fatal error:", error);
        await (prisma as any).reportSet.update({
            where: { id: reportSet.id },
            data: { status: "FAILED", error: error?.message || "Unknown error" },
        });
        throw error;
    }
}

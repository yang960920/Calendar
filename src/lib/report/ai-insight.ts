import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CompanyReportData, DepartmentReportData, MemberReportData } from "./data-collector";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── AI 호출 (모델 폴백 + 재시도) ──

async function callAI(prompt: string): Promise<string> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelName of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (error: any) {
                if (error?.status === 429) {
                    await new Promise(r => setTimeout(r, 3000 * Math.pow(2, attempt)));
                    continue;
                }
                break; // 429 이외 에러 → 다음 모델
            }
        }
    }
    throw new Error("AI_ALL_MODELS_FAILED");
}

// ── 전사 인사이트 ──

export async function generateCompanyInsight(data: CompanyReportData, periodLabel: string): Promise<string> {
    try {
        const prompt = `당신은 한미르(주)의 경영 분석가입니다. 아래 전사 업무 데이터를 분석하여 3~5줄의 핵심 인사이트를 작성하세요.
포함: 전체 생산성 평가, 주목할 성과, 주의가 필요한 영역, 다음 주기 제언.
톤: 간결하고 전문적, 경영진 보고용. 한국어.

기간: ${periodLabel}
총 업무: ${data.totalTasks}건
완료: ${data.completedTasks}건 (${data.completionRate}%)
지연: ${data.delayedTasks}건
총 공헌도: ${data.totalContribution}점
전기 대비: ${data.weekOverWeek.diff > 0 ? "+" : ""}${data.weekOverWeek.diff}%p (전기 ${data.weekOverWeek.prevRate}% → 이번기 ${data.completionRate}%)
프로젝트: ${data.projectSummaries.map(p => `${p.name}(${p.progress}%)`).join(", ") || "없음"}
Top 기여자: ${data.topContributors.map(c => `${c.name}(${c.department}, ${c.contribution}점)`).join(", ") || "없음"}`;

        return await callAI(prompt);
    } catch {
        return generateCompanyFallback(data, periodLabel);
    }
}

// ── 부서 인사이트 ──

export async function generateDepartmentInsight(data: DepartmentReportData, periodLabel: string): Promise<string> {
    try {
        const prompt = `${data.name} 부서의 ${periodLabel} 업무 데이터를 분석하여 2~3줄의 인사이트를 작성하세요.
포함: 부서 생산성 평가, 지연 원인 분석, 업무 분배 균형도.
톤: 간결하고 전문적. 한국어.

총 업무: ${data.totalTasks}건, 완료: ${data.completedTasks}건 (${data.completionRate}%), 지연: ${data.delayedTasks}건
총 공헌도: ${data.totalContribution}점
직원 ${data.members.length}명: ${data.members.map(m => `${m.name}(${m.completionRate}%, ${m.contribution}점)`).join(", ")}`;

        return await callAI(prompt);
    } catch {
        return generateDeptFallback(data);
    }
}

// ── 개인 인사이트 ──

export async function generateIndividualInsight(data: MemberReportData, periodLabel: string): Promise<string> {
    try {
        const topTasks = data.tasks.slice(0, 5).map(t => t.title).join(", ");
        const prompt = `${data.name}님의 ${periodLabel} 업무 데이터를 분석하여 1~2줄의 격려 또는 개선 코멘트를 작성하세요.
톤: 긍정적이고 건설적. 구체적인 업무명을 언급하여 개인화할 것.
주의: 이 코멘트는 관리자만 열람합니다.

총 업무: ${data.totalTasks}건, 완료: ${data.completedTasks}건 (${data.completionRate}%), 지연: ${data.delayedTasks}건
공헌도: ${data.contribution}점, 기한준수율: ${data.timelinessRate}%
주요 업무: ${topTasks || "없음"}`;

        return await callAI(prompt);
    } catch {
        return generateIndividualFallback(data);
    }
}

// ── Fallback 문구 ──

function generateCompanyFallback(data: CompanyReportData, label: string): string {
    const trend = data.weekOverWeek.diff > 0 ? "상승" : data.weekOverWeek.diff < 0 ? "하락" : "유지";
    return `${label} 전사 완료율 ${data.completionRate}%, 전기 대비 ${Math.abs(data.weekOverWeek.diff)}%p ${trend}. 총 ${data.totalTasks}건 중 ${data.delayedTasks}건 지연.`;
}

function generateDeptFallback(data: DepartmentReportData): string {
    return `${data.name}: 완료율 ${data.completionRate}% (${data.completedTasks}/${data.totalTasks}건). 지연 ${data.delayedTasks}건. 총 공헌도 ${data.totalContribution}점.`;
}

function generateIndividualFallback(data: MemberReportData): string {
    return `${data.name}님: 완료율 ${data.completionRate}%, 공헌도 ${data.contribution}점, 기한준수율 ${data.timelinessRate}%.`;
}

// ── 배치 실행 (rate limit 고려) ──

export async function generateInsightsBatch<T>(
    items: T[],
    generator: (item: T) => Promise<string>,
    batchSize: number = 3
): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const promises = batch.map((item, idx) =>
            generator(item)
                .then(text => ({ idx: i + idx, text }))
                .catch(() => ({ idx: i + idx, text: "" }))
        );

        const batchResults = await Promise.allSettled(promises);
        for (const r of batchResults) {
            if (r.status === "fulfilled") {
                results.set(r.value.idx, r.value.text);
            }
        }

        // rate limit 간격
        if (i + batchSize < items.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    return results;
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProjectReportData } from "./data-collector";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function callGemini(prompt: string): Promise<string> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error(`[ProjectReport AI] ${modelName} failed:`, error?.message?.substring(0, 100));
            if (error?.status === 429) {
                await new Promise(r => setTimeout(r, 3000));
            }
            continue;
        }
    }
    throw new Error("ALL_MODELS_FAILED");
}

function buildFallbackInsight(data: ProjectReportData): string {
    const { taskStats, peerReview, compositeScores } = data;
    const top = compositeScores[0];
    const topText = top ? `최우수 참여자: ${top.name} (${top.grade}등급, ${top.compositeScore}점)` : "";

    return `## 성과 요약
프로젝트 "${data.project.name}"가 ${data.project.endDate}에 종료되었습니다.
총 ${taskStats.total}건의 업무 중 ${taskStats.completed}건 완료 (완료율 ${taskStats.completionRate}%).
기한 준수율 ${taskStats.onTimeRate}%, 지연 업무 ${taskStats.delayed}건.

## 잘한 점
- 완료율 ${taskStats.completionRate}% 달성
- 피어 리뷰 참여율 ${peerReview.participationRate}%

## 개선 사항
${taskStats.delayed > 0 ? `- 지연 업무 ${taskStats.delayed}건 발생` : "- 지연 업무 없음"}
${peerReview.unreviewed.length > 0 ? `- 피어 리뷰 미참여: ${peerReview.unreviewed.join(", ")}` : ""}

## 교훈
${topText}
프로젝트 기간: ${data.project.durationDays}일`;
}

export async function generateProjectRetrospective(data: ProjectReportData): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return buildFallbackInsight(data);
    }

    const prompt = `당신은 프로젝트 관리 전문가입니다. 아래 프로젝트 데이터를 분석하여 **프로젝트 회고**를 작성해주세요.

## 프로젝트 정보
- 프로젝트명: ${data.project.name}
- 카테고리: ${data.project.category}
- 기간: ${data.project.startDate} ~ ${data.project.endDate} (${data.project.durationDays}일)
- 참여자: ${data.participants.map(p => p.name).join(", ")} (${data.participants.length}명)

## 업무 현황
- 총 업무: ${data.taskStats.total}건
- 완료: ${data.taskStats.completed}건 (${data.taskStats.completionRate}%)
- 진행중: ${data.taskStats.inProgress}건
- 지연: ${data.taskStats.delayed}건
- 기한 준수율: ${data.taskStats.onTimeRate}%
- 총 공헌도: ${data.taskStats.totalContribution}점

## 참여자 성과 (순위순)
${data.memberPerformance.map((m, i) => `${i + 1}. ${m.name} — 완료율 ${m.completionRate}%, 공헌도 ${m.totalContribution}점, 기한준수 ${m.onTimeRate}%`).join("\n")}

## 피어 리뷰
- 참여율: ${data.peerReview.participationRate}%
${data.peerReview.memberScores.map(m => `- ${m.name}: 평균 ${m.avgScore}/5.0 (${m.reviewCount}건)`).join("\n")}
${data.peerReview.unreviewed.length > 0 ? `- 미참여: ${data.peerReview.unreviewed.join(", ")}` : ""}

## 종합 등급
${data.compositeScores.map(s => `- ${s.name}: ${s.grade}등급 (${s.compositeScore}점)`).join("\n")}

---

아래 4개 섹션으로 나누어 한국어로 작성해주세요. 각 섹션은 2~4문장으로 간결하게.
마크다운 헤딩(##)은 사용하지 마세요. 섹션 구분은 아래 레이블을 그대로 사용하세요.

[성과 요약]
프로젝트 전체 성과를 객관적 수치 위주로 요약

[잘한 점]
팀이 잘 수행한 부분 (구체적으로)

[개선 사항]
개선이 필요한 부분과 원인 분석

[교훈]
향후 프로젝트에 적용할 수 있는 교훈`;

    try {
        const result = await callGemini(prompt);
        return result;
    } catch (error) {
        console.error("[ProjectReport AI] Retrospective generation failed, using fallback:", error);
        return buildFallbackInsight(data);
    }
}

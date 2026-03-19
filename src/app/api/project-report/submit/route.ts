import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const projectId = formData.get("projectId") as string | null;
        const userId = formData.get("userId") as string | null;
        const comment = formData.get("comment") as string | null;

        if (!file || !projectId || !userId) {
            return NextResponse.json({ error: "필수 필드가 누락되었습니다." }, { status: 400 });
        }

        // PDF 검증
        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "PDF 파일만 업로드 가능합니다." }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "파일 크기는 10MB를 초과할 수 없습니다." }, { status: 400 });
        }

        // Creator 권한 검증
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { creatorId: true },
        });
        if (!project || project.creatorId !== userId) {
            return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
        }

        // 기존 보고서 존재 확인
        const report = await prisma.projectReport.findUnique({
            where: { projectId },
        });
        if (!report) {
            return NextResponse.json({ error: "생성된 보고서가 없습니다." }, { status: 404 });
        }

        // Vercel Blob에 업로드
        const buffer = Buffer.from(await file.arrayBuffer());
        const revisedFilename = file.name;
        const blob = await put(`reports/revised/${projectId}/${revisedFilename}`, buffer, {
            access: "public",
            contentType: "application/pdf",
        });

        // DB 업데이트
        await prisma.projectReport.update({
            where: { projectId },
            data: {
                revisedUrl: blob.url,
                revisedFilename,
                revisedAt: new Date(),
                revisedComment: comment || null,
                status: "SUBMITTED",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[ProjectReport Submit] Error:", error);
        return NextResponse.json({ error: "수정본 제출에 실패했습니다." }, { status: 500 });
    }
}

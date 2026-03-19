import { NextResponse } from "next/server";
import { generatePendingProjectReports } from "@/app/actions/project-report";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await generatePendingProjectReports();

        return NextResponse.json({
            ok: true,
            ...result,
            message: `${result.generated}개 생성, ${result.failed}개 실패 (총 ${result.total}개 대상)`,
        });
    } catch (error: any) {
        console.error("[Cron ProjectReport] Error:", error);
        return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
    }
}

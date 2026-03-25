"use client";

import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { MailWidget } from "@/components/dashboard/MailWidget";
import { LoginHistoryWidget } from "@/components/dashboard/LoginHistoryWidget";
import { AppGrid } from "@/components/dashboard/AppGrid";
import { TaskStatusWidget } from "@/components/dashboard/TaskStatusWidget";
import { WorkClockWidget } from "@/components/dashboard/WorkClockWidget";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { TodayTaskWidget } from "@/components/dashboard/TodayTaskWidget";
import { ActivityFeedWidget } from "@/components/dashboard/ActivityFeedWidget";
import { AIChatAssistant } from "@/components/AIChatAssistant";

export default function OfficeDashboard() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b py-4 px-6 md:px-8 shadow-sm">
                <h1 className="text-xl font-bold tracking-tight text-primary">오피스 홈</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Keeper Office Dashboard</p>
            </header>

            <main className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
                {/* 3×3 위젯 그리드 — 행별 개별 높이 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                    {/* Row 1 — 프로필 / 알림 / 접속기록 (컴팩트) */}
                    <div className="h-[220px]"><UserProfileCard /></div>
                    <div className="h-[220px]"><MailWidget /></div>
                    <div className="h-[220px]"><LoginHistoryWidget /></div>

                    {/* Row 2 — 앱그리드 / 업무상태 / 근무체크 */}
                    <div className="h-[320px]"><AppGrid /></div>
                    <div className="h-[320px]"><TaskStatusWidget /></div>
                    <div className="h-[320px]"><WorkClockWidget /></div>

                    {/* Row 3 — 미니캘린더 / 오늘할일 / 활동피드 */}
                    <div className="h-[320px]"><MiniCalendar /></div>
                    <div className="h-[320px]"><TodayTaskWidget /></div>
                    <div className="h-[320px]"><ActivityFeedWidget /></div>
                </div>
            </main>

            <AIChatAssistant />
        </div>
    );
}

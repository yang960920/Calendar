"use client";

import React, { useState } from "react";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";
import { TaskForm } from "@/components/TaskForm";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CategoryBarChart } from "@/components/CategoryBarChart";
import { YearlyTaskList } from "@/components/YearlyTaskList";
import { useTaskStore } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function YearlyPage() {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(String(Math.max(2026, currentDate.getFullYear())));

    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const heatmapColor = useStore(useSettingsStore, (s) => s.heatmapColor) || "green";

    // 해당 연도 전체 통계 데이터 일부 계산 (필요시 컴포넌트 분리 가능)
    const yearlyTasks = tasks.filter(t => t.date.startsWith(selectedYear));
    const totalPlanned = yearlyTasks.reduce((acc, t) => acc + t.planned, 0);
    const totalDone = yearlyTasks.reduce((acc, t) => acc + t.done, 0);
    const yearlyRate = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* 사이드바 영역 */}
            <aside className="w-64 border-r hidden md:flex flex-col flex-shrink-0 bg-muted/20">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold tracking-tight text-primary">Yearly Overview</h2>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                        Months
                    </div>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <div
                            key={month}
                            className="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted cursor-pointer transition-colors"
                        >
                            <span>{month}월</span>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* 메인 컨텐츠 영역 */}
            <main className="flex-1 pb-20 overflow-x-hidden">
                <header className="border-b py-4 px-6 md:px-12 shadow-sm flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-primary">{selectedYear}년 캘린더</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            연간 달성률: {yearlyRate}% ({totalDone} / {totalPlanned})
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="연도" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2026, 2027, 2028, 2029, 2030].map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </header>

                <div className="container mx-auto px-4 md:px-12 py-8 space-y-8 max-w-7xl">
                    <section>
                        <HeatmapCalendar year={selectedYear} colorPalette={heatmapColor} />
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="col-span-1">
                            {/* 연간 카테고리 분포 등 */}
                            <CategoryBarChart year={selectedYear} />
                        </div>
                        <div className="col-span-1 border rounded-xl bg-card p-6 flex items-center justify-center text-muted-foreground">
                            {/* 기타 연간 통계 영역 유보 */}
                            연간 통계 정보가 추가될 예정입니다.
                        </div>
                    </section>

                    {/* 해당 연도의 리스트 영역 */}
                    <section className="pt-4 mb-8">
                        <h2 className="text-xl font-semibold mb-4">{selectedYear}년 전체 업무 일지</h2>
                        <YearlyTaskList year={selectedYear} />
                    </section>
                </div>
            </main>

            {/* Floating Action Button */}
            <TaskForm />
        </div>
    );
}

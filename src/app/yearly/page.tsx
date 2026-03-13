"use client";

import React, { useState, useMemo } from "react";
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
import { ProjectContributionChart } from "@/components/ProjectContributionChart";
import { useTaskStore } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { CalendarDays } from "lucide-react";

export default function YearlyPage() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const [selectedYear, setSelectedYear] = useState(String(Math.max(2026, currentDate.getFullYear())));
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const heatmapColor = useStore(useSettingsStore, (s) => s.heatmapColor) || "green";

    // 연도별 전체 태스크
    const yearlyTasks = useMemo(() => tasks.filter(t => t.date.startsWith(selectedYear)), [tasks, selectedYear]);

    // 월별 통계 데이터
    const monthlyStats = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const mm = String(i + 1).padStart(2, "0");
            const monthTasks = yearlyTasks.filter(t => t.date.substring(5, 7) === mm);
            const planned = monthTasks.reduce((a, t) => a + t.planned, 0);
            const done = monthTasks.reduce((a, t) => a + t.done, 0);
            const rate = planned > 0 ? Math.round((done / planned) * 100) : 0;
            return { month: i + 1, count: monthTasks.length, rate, planned, done };
        });
    }, [yearlyTasks]);

    // 전체 연간 통계
    const totalPlanned = yearlyTasks.reduce((acc, t) => acc + t.planned, 0);
    const totalDone = yearlyTasks.reduce((acc, t) => acc + t.done, 0);
    const yearlyRate = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

    // 월 필터용 문자열
    const monthStr = selectedMonth ? String(selectedMonth) : undefined;

    const handleMonthClick = (month: number) => {
        setSelectedMonth(prev => prev === month ? null : month);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* 사이드바: 월별 미니 대시보드 */}
            <aside className="w-72 border-r hidden md:flex flex-col flex-shrink-0 bg-muted/20">
                <div className="p-5 border-b">
                    <h2 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Yearly Overview
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        연간 달성률 {yearlyRate}% · {yearlyTasks.length}건
                    </p>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {/* 전체 보기 버튼 */}
                    <button
                        onClick={() => setSelectedMonth(null)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${selectedMonth === null
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                    >
                        <span>📊 전체 (연간)</span>
                        <span>{yearlyTasks.length}건</span>
                    </button>

                    <div className="text-[10px] font-semibold text-muted-foreground mt-3 mb-1.5 uppercase tracking-wider px-1">
                        Monthly
                    </div>

                    {monthlyStats.map((m) => {
                        const isCurrentMonth = String(currentDate.getFullYear()) === selectedYear && m.month === currentMonth;
                        const isSelected = selectedMonth === m.month;

                        return (
                            <button
                                key={m.month}
                                onClick={() => handleMonthClick(m.month)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${isSelected
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : isCurrentMonth
                                            ? "bg-primary/10 ring-1 ring-primary/30"
                                            : "hover:bg-muted"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-medium flex items-center gap-1.5">
                                        {m.month}월
                                        {isCurrentMonth && !isSelected && (
                                            <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded font-semibold">
                                                NOW
                                            </span>
                                        )}
                                    </span>
                                    <span className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                        {m.count}건
                                    </span>
                                </div>

                                {/* 미니 프로그레스 바 */}
                                <div className="flex items-center gap-2">
                                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isSelected ? "bg-primary-foreground/20" : "bg-muted"
                                        }`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${isSelected
                                                    ? "bg-primary-foreground"
                                                    : m.rate >= 80 ? "bg-emerald-500"
                                                        : m.rate >= 50 ? "bg-amber-500"
                                                            : m.rate > 0 ? "bg-orange-500"
                                                                : "bg-transparent"
                                                }`}
                                            style={{ width: `${m.rate}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-mono w-8 text-right ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                        }`}>
                                        {m.rate}%
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* 메인 컨텐츠 영역 */}
            <main className="flex-1 pb-20 overflow-x-hidden">
                <header className="border-b py-4 px-6 md:px-12 shadow-sm flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-primary">
                            {selectedYear}년 {selectedMonth ? `${selectedMonth}월` : ""} 캘린더
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {selectedMonth ? (
                                <>달성률: {monthlyStats[selectedMonth - 1].rate}% ({monthlyStats[selectedMonth - 1].done} / {monthlyStats[selectedMonth - 1].planned})</>
                            ) : (
                                <>연간 달성률: {yearlyRate}% ({totalDone} / {totalPlanned})</>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedMonth(null); }}>
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
                        <HeatmapCalendar
                            year={selectedYear}
                            month={monthStr}
                            colorPalette={heatmapColor}
                        />
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="col-span-1">
                            <CategoryBarChart year={selectedYear} month={monthStr} />
                        </div>
                        <div className="col-span-1">
                            <ProjectContributionChart year={selectedYear} month={monthStr} />
                        </div>
                    </section>

                    <section className="pt-4 mb-8">
                        <h2 className="text-xl font-semibold mb-4">
                            {selectedYear}년 {selectedMonth ? `${selectedMonth}월` : "전체"} 업무 일지
                        </h2>
                        <YearlyTaskList year={selectedYear} month={monthStr} />
                    </section>
                </div>
            </main>

            <TaskForm />
        </div>
    );
}

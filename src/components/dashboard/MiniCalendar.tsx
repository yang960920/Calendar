"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getTaskDatesForMonth, getTasksForDate } from "@/app/actions/dashboard";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DayTask {
    id: string;
    title: string;
    status: string;
    project: { name: string } | null;
}

export function MiniCalendar() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dayTasks, setDayTasks] = useState<DayTask[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    useEffect(() => {
        if (!user) return;
        getTaskDatesForMonth(user.id, year, month).then((res) => {
            if (res.success && res.data) {
                setTaskDates(new Set(res.data));
            }
        });
    }, [user, year, month]);

    // 날짜 클릭 → 업무 조회
    const handleDateClick = async (day: number) => {
        if (!user) return;
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (selectedDate === dateStr) {
            setSelectedDate(null);
            setDayTasks([]);
            return;
        }

        setSelectedDate(dateStr);
        setLoadingTasks(true);
        const res = await getTasksForDate(user.id, dateStr);
        if (res.success && res.data) {
            setDayTasks(res.data as any);
        } else {
            setDayTasks([]);
        }
        setLoadingTasks(false);
    };

    const prevMonth = () => { setCurrentDate(new Date(year, month - 2, 1)); setSelectedDate(null); setDayTasks([]); };
    const nextMonth = () => { setCurrentDate(new Date(year, month, 1)); setSelectedDate(null); setDayTasks([]); };
    const goToday = () => { setCurrentDate(new Date()); setSelectedDate(null); setDayTasks([]); };

    // 달력 생성
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
        week.push(d);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
    const showMax = 3;
    const extraCount = dayTasks.length - showMax;

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold">일정</h3>
            </div>

            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between mb-1.5">
                <button onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-semibold">{year}년 {month}월</span>
                <div className="flex items-center gap-1">
                    <button onClick={goToday} className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">
                        오늘
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {dayLabels.map((d, i) => (
                    <div key={d} className={`text-center text-[9px] font-medium py-0.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
                        {d}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div>
                {weeks.map((wk, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-0.5">
                        {wk.map((day, di) => {
                            if (!day) return <div key={di} className="h-6" />;
                            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedDate;
                            const hasTask = taskDates.has(dateStr);

                            return (
                                <div
                                    key={di}
                                    onClick={() => handleDateClick(day)}
                                    className={`relative h-6 flex items-center justify-center text-[11px] rounded cursor-pointer transition-colors ${
                                        isSelected
                                            ? "bg-primary/30 text-primary font-bold ring-1 ring-primary/50"
                                            : isToday
                                                ? "bg-primary text-primary-foreground font-bold"
                                                : "hover:bg-muted"
                                    } ${di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : ""}`}
                                >
                                    {day}
                                    {hasTask && !isToday && !isSelected && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* 선택 날짜 업무 패널 */}
            {selectedDate && (
                <div className="mt-2 pt-2 border-t flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-primary">
                            {parseInt(selectedDate.split("-")[1])}월 {parseInt(selectedDate.split("-")[2])}일 업무
                        </span>
                        <button onClick={() => { setSelectedDate(null); setDayTasks([]); }} className="p-0.5 hover:bg-muted rounded">
                            <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                    </div>
                    {loadingTasks ? (
                        <p className="text-[11px] text-muted-foreground">로딩 중...</p>
                    ) : dayTasks.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">업무가 없습니다</p>
                    ) : (
                        <div className="space-y-1">
                            {dayTasks.slice(0, showMax).map((task) => (
                                <div key={task.id} className="flex items-center gap-1.5 text-[11px]">
                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                        task.status === "DONE" ? "bg-emerald-400" : task.status === "IN_PROGRESS" ? "bg-blue-400" : "bg-zinc-400"
                                    }`} />
                                    <span className="truncate">{task.title}</span>
                                </div>
                            ))}
                            {extraCount > 0 && (
                                <p className="text-[10px] text-muted-foreground pl-3">+{extraCount}개 더...</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

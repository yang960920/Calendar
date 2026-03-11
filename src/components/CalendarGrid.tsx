import React from "react";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
    startOfDay,
    isAfter,
} from "date-fns";
import { Task, useTaskStore } from "@/store/useTaskStore";
import { updateTaskStatus } from "@/app/actions/task";
import { DayDetailPopover } from "@/components/DayDetailPopover";

interface CalendarGridProps {
    year: string;
    month: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    userRole?: "CREATOR" | "PARTICIPANT";
    currentUserId?: string;
    projectCreatorId?: string;
}

// 카테고리별 테마 색상 맵 (레퍼런스 이미지 스타일 참고)
const categoryColors: Record<string, string> = {
    업무: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800",
    개인: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-200 dark:border-green-800",
    운동: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border-orange-200 dark:border-orange-800",
    건강: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800",
    가족: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 border-purple-200 dark:border-purple-800",
    자기계발: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
};

const MAX_VISIBLE_TASKS = 3;

/** 캘린더에 표시되는 우선순위 정렬 */
function sortByPriority(tasks: Task[]): Task[] {
    const today = startOfDay(new Date());

    return [...tasks].sort((a, b) => {
        const getPriority = (task: Task): number => {
            const isCompleted = task.done >= task.planned;
            const taskEnd = startOfDay(new Date(task.endDate || task.date));
            const isOverdue = !isCompleted && isAfter(today, taskEnd);
            const isDueToday = !isCompleted && format(today, "yyyy-MM-dd") === format(taskEnd, "yyyy-MM-dd");

            if (isOverdue) return 0; // 1순위: 기한 지연
            if (isDueToday) return 1; // 2순위: 오늘 마감
            if (!isCompleted) return 2; // 3순위: 미완료
            return 3; // 4순위: 완료
        };
        return getPriority(a) - getPriority(b);
    });
}

export const CalendarGrid = ({ year, month, tasks, onTaskClick, userRole, currentUserId, projectCreatorId }: CalendarGridProps) => {
    const updateTask = useTaskStore((state) => state.updateTask);

    // Date calculations
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

    // Task grouping by date (Multi-day support)
    const tasksByDate = tasks.reduce((acc, task) => {
        const tStart = startOfDay(new Date(task.date));
        const tEnd = startOfDay(new Date(task.endDate || task.date));

        // 날짜가 역전된 경우 방어 로직
        if (isAfter(tStart, tEnd)) {
            const dateStr = format(tStart, "yyyy-MM-dd");
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(task);
            return acc;
        }

        const intervalDays = eachDayOfInterval({ start: tStart, end: tEnd });
        intervalDays.forEach(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(task);
        });

        return acc;
    }, {} as Record<string, Task[]>);

    const handleToggleTask = async (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();

        // 담당자 또는 프로젝트 생성자만 업무 완료 토글 가능
        const isAssignee = currentUserId && (
            task.assigneeId === currentUserId ||
            (task.assigneeIds && task.assigneeIds.includes(currentUserId))
        );
        const isCreator = currentUserId && projectCreatorId === currentUserId;
        if (!isAssignee && !isCreator) {
            alert("본인에게 할당된 업무만 완료 처리할 수 있습니다.");
            return;
        }

        // 이미 완료된(done >= planned) 상태인지 확인
        const isCompleted = task.done >= task.planned;
        const newDone = isCompleted ? 0 : task.planned;
        const isNowCompleted = !isCompleted;

        try {
            // DB Server Action
            const result = await updateTaskStatus(task.id, {
                done: newDone,
                isCompleted: isNowCompleted,
            });

            if (result.success) {
                // DB 성공 시에만 로컬 상태 반영
                updateTask(task.id, {
                    done: newDone,
                    completedAt: isNowCompleted ? new Date().toISOString() : undefined,
                });
            } else {
                alert("업무 상태 업데이트 실패");
            }
        } catch (error) {
            console.error(error);
            alert("상태 수정 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="w-full bg-card border rounded-xl overflow-hidden shadow-sm">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold text-muted-foreground p-2">
                {weekDays.map((day) => (
                    <div key={day} className={day === "일" ? "text-red-500" : day === "토" ? "text-blue-500" : ""}>
                        {day}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 min-h-[500px] auto-rows-[minmax(120px,auto)]">
                {days.map((day, idx) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayTasks = tasksByDate[dateKey] || [];
                    const sortedTasks = sortByPriority(dayTasks);
                    const visibleTasks = sortedTasks.slice(0, MAX_VISIBLE_TASKS);
                    const hiddenCount = sortedTasks.length - MAX_VISIBLE_TASKS;
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayLocal = isToday(day);

                    return (
                        <DayDetailPopover
                            key={day.toString()}
                            dateKey={dateKey}
                            tasks={sortedTasks}
                            onTaskClick={onTaskClick}
                            userRole={userRole}
                            currentUserId={currentUserId}
                            projectCreatorId={projectCreatorId}
                        >
                            <div
                                className={`border-b border-r p-2 flex flex-col gap-1 transition-colors cursor-pointer hover:bg-muted/30 ${!isCurrentMonth ? "bg-muted/20 opacity-50" : ""
                                    } ${isTodayLocal ? "bg-primary/5" : ""} ${idx % 7 === 6 ? "border-r-0" : ""
                                    }`}
                            >
                                {/* 날짜 헤더 */}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`text-sm font-medium ${isTodayLocal
                                            ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                                            : "text-muted-foreground"
                                            }`}
                                    >
                                        {format(day, "d")}
                                    </span>
                                    {/* 업무 개수 인디케이터 */}
                                    {dayTasks.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {dayTasks.length}건
                                        </span>
                                    )}
                                </div>

                                {/* Task 목록 (최대 3개) */}
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    {visibleTasks.map((task) => {
                                        const isCompleted = task.done >= task.planned;

                                        // Gantt & Status calculations
                                        const isStart = dateKey === task.date;
                                        const isEnd = dateKey === (task.endDate || task.date);

                                        const today = startOfDay(new Date());
                                        const taskEnd = startOfDay(new Date(task.endDate || task.date));
                                        const isOverdue = !isCompleted && isAfter(today, taskEnd);

                                        let colorClass = categoryColors[task.category] || "bg-muted text-foreground border-border";
                                        if (isOverdue) {
                                            colorClass = "bg-red-100/80 text-red-900 border-red-500 border-[1.5px] dark:bg-red-900/40 dark:text-red-100";
                                        }

                                        const ganttClasses =
                                            isStart && isEnd ? "rounded-md mx-1" :
                                                isStart && !isEnd ? "rounded-l-md rounded-r-none ml-1 -mr-2 pr-2 border-r-0 z-10" :
                                                    !isStart && isEnd ? "rounded-r-md rounded-l-none mr-1 -ml-2 pl-2 border-l-0 z-10" :
                                                        "rounded-none -mx-2 px-2 border-l-0 border-r-0 z-0";

                                        return (
                                            <div
                                                key={task.id}
                                                className={`
                                                    flex items-center gap-1.5 p-1 h-[24px] overflow-hidden border text-[11px] transition-opacity pointer-events-none
                                                    ${colorClass}
                                                    ${isCompleted ? "opacity-50 grayscale-[50%]" : ""}
                                                    ${ganttClasses}
                                                `}
                                            >
                                                {isStart ? (
                                                    <>
                                                        {/* 상태 dot */}
                                                        <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${isCompleted ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-blue-400"
                                                            }`} />
                                                        <span className={`font-medium truncate ${isCompleted ? 'line-through' : ''}`}>
                                                            {task.title}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <div className="opacity-0 w-full h-full pointer-events-none select-none">&nbsp;</div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* +N개 더보기 뱃지 */}
                                    {hiddenCount > 0 && (
                                        <div className="text-[10px] text-muted-foreground font-medium text-center py-0.5 bg-muted/40 rounded-md mx-1">
                                            +{hiddenCount}건 더보기
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DayDetailPopover>
                    );
                })}
            </div>
        </div>
    );
};

"use client";

import React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Task, useTaskStore } from "@/store/useTaskStore";
import { updateTaskStatus } from "@/app/actions/task";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DayDetailPopoverProps {
    dateKey: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    userRole?: "CREATOR" | "PARTICIPANT";
    currentUserId?: string;
    projectCreatorId?: string;
    children: React.ReactNode;
}

// 카테고리별 색상 (dot 표시용)
const categoryDotColors: Record<string, string> = {
    업무: "bg-blue-500",
    개인: "bg-green-500",
    운동: "bg-orange-500",
    건강: "bg-red-500",
    가족: "bg-purple-500",
    자기계발: "bg-yellow-500",
    기획: "bg-blue-500",
    개발: "bg-green-500",
    디자인: "bg-pink-500",
    회의: "bg-amber-500",
    영업: "bg-teal-500",
    기타: "bg-gray-500",
};

const getStatusInfo = (task: Task) => {
    const isCompleted = task.done >= task.planned;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskEnd = new Date(task.endDate || task.date);
    taskEnd.setHours(0, 0, 0, 0);
    const isOverdue = !isCompleted && today > taskEnd;

    if (isCompleted) return { label: "완료", color: "text-green-500", dot: "bg-green-500" };
    if (isOverdue) return { label: "지연", color: "text-red-500", dot: "bg-red-500" };
    return { label: "진행중", color: "text-blue-500", dot: "bg-blue-500" };
};

export const DayDetailPopover = ({
    dateKey,
    tasks,
    onTaskClick,
    userRole,
    currentUserId,
    projectCreatorId,
    children,
}: DayDetailPopoverProps) => {
    const updateTask = useTaskStore((state) => state.updateTask);

    const handleToggleTask = async (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();

        // 권한 확인
        const isAssignee = currentUserId && (
            task.assigneeId === currentUserId ||
            (task.assigneeIds && task.assigneeIds.includes(currentUserId))
        );
        const isCreator = currentUserId && projectCreatorId === currentUserId;
        if (!isAssignee && !isCreator) {
            alert("본인에게 할당된 업무만 완료 처리할 수 있습니다.");
            return;
        }

        const isCompleted = task.done >= task.planned;
        const newDone = isCompleted ? 0 : task.planned;
        const isNowCompleted = !isCompleted;

        try {
            const result = await updateTaskStatus(task.id, {
                done: newDone,
                isCompleted: isNowCompleted,
            });

            if (result.success) {
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

    // 날짜 포맷
    const dateObj = new Date(dateKey + "T00:00:00");
    const formattedDate = format(dateObj, "M월 d일 (EEEE)", { locale: ko });

    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-[340px] p-0 shadow-xl border-border/60"
                align="start"
                sideOffset={4}
            >
                {/* 헤더 */}
                <div className="px-4 py-3 border-b bg-muted/30">
                    <h3 className="font-semibold text-sm">{formattedDate}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        총 {tasks.length}건의 업무
                    </p>
                </div>

                {/* 업무 리스트 */}
                <div className="max-h-[320px] overflow-y-auto">
                    {tasks.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            이 날짜에 등록된 업무가 없습니다.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {tasks.map((task) => {
                                const isCompleted = task.done >= task.planned;
                                const status = getStatusInfo(task);
                                const dotColor = categoryDotColors[task.category] || "bg-gray-400";

                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick(task)}
                                    >
                                        {/* 체크박스 */}
                                        <div
                                            onClick={(e) => handleToggleTask(e, task)}
                                            className={`
                                                shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer
                                                ${isCompleted
                                                    ? "bg-foreground text-background border-foreground"
                                                    : "bg-background border-muted-foreground/40 hover:border-foreground/60"
                                                }
                                            `}
                                        >
                                            {isCompleted && (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>

                                        {/* 카테고리 dot + 업무 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                                <span className={`text-sm font-medium truncate ${isCompleted ? "line-through opacity-50" : ""}`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground">{task.category}</span>
                                                {task.assigneeNames && task.assigneeNames.length > 0 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        👤 {task.assigneeNames.join(', ')}
                                                    </span>
                                                )}
                                                {task.subTasks && task.subTasks.length > 0 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        📋 {task.subTasks.filter(st => st.isCompleted).length}/{task.subTasks.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 상태 뱃지 */}
                                        <div className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.color}`}>
                                            {status.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

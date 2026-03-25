"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getDashboardStats } from "@/app/actions/dashboard";
import { updateTaskStatus } from "@/app/actions/task";
import { ListChecks, Circle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface TodayTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    project: { name: string } | null;
    assignees: { id: string; name: string }[];
}

export function TodayTaskWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [tasks, setTasks] = useState<TodayTask[]>([]);

    useEffect(() => {
        if (!user) return;
        getDashboardStats(user.id).then((res) => {
            if (res.success && res.data) {
                setTasks(res.data.todayTasks as any);
            }
        });
    }, [user]);

    const handleToggleStatus = async (taskId: string, currentStatus: string) => {
        const isCompleted = currentStatus !== "DONE";
        
        // 낙관적 업데이트 (UI 즉시 반영)
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: isCompleted ? "DONE" : "TODO" } : t));

        try {
            const res = await updateTaskStatus(taskId, { done: 0, isCompleted });
            if (!res.success) throw new Error(res.error || "상태 변경 실패");
        } catch (error: any) {
            // 실패 시 원상복구
            setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: currentStatus } : t));
            alert(error.message || "업무 상태 업데이트 중 오류가 발생했습니다.");
        }
    };

    const todayStr = format(new Date(), "M/d (eee)");

    return (
        <div id="today-task-widget" className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl border border-amber-500/30 shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold">{todayStr} 해야할 업무</h3>
            </div>

            {tasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center space-y-1">
                        <CheckCircle2 className="h-8 w-8 mx-auto opacity-30" />
                        <p>오늘 예정된 업무가 없습니다</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-black/20 text-sm group hover:bg-black/40 transition-colors">
                            <button
                                onClick={() => handleToggleStatus(task.id, task.status)}
                                className="mt-0.5 hover:scale-110 transition-transform shrink-0 outline-none"
                            >
                                {task.status === "DONE" ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                    <Circle className="h-4 w-4 text-amber-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate transition-all ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {task.project?.name}{task.assignees.length > 0 ? ` · ${task.assignees.map(a => a.name).join(", ")}` : ""}
                                </p>
                            </div>
                            {task.priority === "HIGH" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 shrink-0">긴급</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

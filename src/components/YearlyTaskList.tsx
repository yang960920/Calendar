"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { EditTaskDialog } from "@/components/EditTaskDialog";

interface YearlyTaskListProps {
    year: string;
}

export const YearlyTaskList = ({ year }: YearlyTaskListProps) => {
    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const [mounted, setMounted] = useState(false);

    // 검색어 및 다이얼로그 상태
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 선택된 연도 및 검색어에 해당하는 데이터만 필터링
    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task) => task.date.startsWith(year));

        if (searchTerm.trim() !== "") {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                (task) =>
                    task.title.toLowerCase().includes(lowerSearchTerm) ||
                    (task.content && task.content.toLowerCase().includes(lowerSearchTerm))
            );
        }

        return result.sort((a, b) => (a.date > b.date ? 1 : -1)); // 날짜 오름차순
    }, [tasks, year, searchTerm]);

    const handleRowClick = (task: Task) => {
        setSelectedTask(task);
        setIsEditDialogOpen(true);
    };

    if (!mounted) {
        return (
            <div className="bg-card border rounded-xl min-h-[200px] flex items-center justify-center text-muted-foreground p-6">
                연간 업무 일지 리스트를 불러오는 중입니다...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 검색 바 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="업무명 또는 내용 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full md:max-w-sm"
                />
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">날짜</th>
                                <th className="px-4 py-3 font-medium">카테고리</th>
                                <th className="px-4 py-3 font-medium w-full">업무명</th>
                                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">계획 / 실행</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y relative">
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        검색 결과 또는 등록된 업무 일지가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => handleRowClick(task)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {task.date}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {task.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground group-hover:text-primary transition-colors">
                                            {task.title}
                                            {task.content && <p className="text-xs text-muted-foreground mt-0.5 font-normal truncate max-w-sm">{task.content}</p>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-muted-foreground">
                                            {task.planned} / <span className={task.done >= task.planned ? "text-green-500 font-semibold" : ""}>{task.done}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 수정 컴포넌트 마운트 */}
            <EditTaskDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                task={selectedTask}
            />
        </div>
    );
};

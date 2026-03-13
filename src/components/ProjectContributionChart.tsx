"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useStore } from "@/hooks/useStore";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6"];

interface ProjectContributionChartProps {
    year: string;
    month?: string | null;
}

export const ProjectContributionChart = ({ year, month }: ProjectContributionChartProps) => {
    const tasks = useStore(useTaskStore, (s) => s.tasks) || [];
    const projects = useStore(useProjectStore, (s) => s.projects) || [];

    const data = useMemo(() => {
        // 해당  연도(+월) 필터
        let filtered = tasks.filter((t) => t.date.startsWith(year));
        if (month) {
            const mm = month.padStart(2, "0");
            filtered = filtered.filter((t) => t.date.substring(5, 7) === mm);
        }

        // projectId로 그룹핑
        const groups: Record<string, number> = {};
        filtered.forEach((t) => {
            const key = t.projectId || "__personal__";
            groups[key] = (groups[key] || 0) + 1;
        });

        // 프로젝트 이름 매핑
        return Object.entries(groups)
            .map(([id, count]) => ({
                name: id === "__personal__" ? "개인 업무" : projects.find((p) => p.id === id)?.title || id,
                value: count,
            }))
            .sort((a, b) => b.value - a.value);
    }, [tasks, projects, year, month]);

    const total = data.reduce((s, d) => s + d.value, 0);

    if (data.length === 0) {
        return (
            <div className="border rounded-xl bg-card p-6 flex items-center justify-center text-muted-foreground h-full">
                프로젝트 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="border rounded-xl bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">
                프로젝트별 기여도
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
                {month ? `${year}년 ${month}월` : `${year}년`} 총 {total}건
            </p>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            strokeWidth={0}
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                color: "hsl(var(--foreground))",
                                fontSize: "12px",
                            }}
                            formatter={((value: number, name: string) => [
                                `${value}건 (${Math.round((value / total) * 100)}%)`,
                                name,
                            ]) as any}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {/* 범례 */}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
                {data.slice(0, 6).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs truncate">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                        <span className="text-muted-foreground ml-auto shrink-0">{d.value}건</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

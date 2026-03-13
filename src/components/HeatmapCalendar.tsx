"use client";

import React, { useMemo, useEffect, useState } from "react";
import HeatMap from "@uiw/react-heat-map";
import { useTheme } from "next-themes";
import { useTaskStore } from "@/store/useTaskStore";
import { useStore } from "@/hooks/useStore";
import { getDailyStats } from "@/lib/statistics";

// 다중 팔레트 지원
const COLOR_PALETTES: Record<string, { light: Record<number, string>; dark: Record<number, string> }> = {
    green: {
        light: { 0: "#ebedf0", 1: "#9be9a8", 2: "#40c463", 3: "#30a14e", 4: "#216e39" },
        dark: { 0: "#161b22", 1: "#0e4429", 2: "#006d32", 3: "#26a641", 4: "#39d353" },
    },
    blue: {
        light: { 0: "#ebedf0", 1: "#bfdbfe", 2: "#60a5fa", 3: "#2563eb", 4: "#1e3a8a" },
        dark: { 0: "#161b22", 1: "#1e3a5f", 2: "#2563eb", 3: "#60a5fa", 4: "#93c5fd" },
    },
    purple: {
        light: { 0: "#ebedf0", 1: "#ddd6fe", 2: "#a78bfa", 3: "#7c3aed", 4: "#4c1d95" },
        dark: { 0: "#161b22", 1: "#3b0764", 2: "#7c3aed", 3: "#a78bfa", 4: "#c4b5fd" },
    },
    orange: {
        light: { 0: "#ebedf0", 1: "#fed7aa", 2: "#fb923c", 3: "#ea580c", 4: "#7c2d12" },
        dark: { 0: "#161b22", 1: "#7c2d12", 2: "#ea580c", 3: "#fb923c", 4: "#fdba74" },
    },
};

interface HeatmapCalendarProps {
    year?: string;
    month?: string;
    colorPalette?: string;
}

export const HeatmapCalendar = ({ year, month, colorPalette = "green" }: HeatmapCalendarProps) => {
    const { resolvedTheme } = useTheme();
    const tasks = useStore(useTaskStore, (state) => state.tasks) || [];
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const palette = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.green;
    const panelColors = resolvedTheme === "dark" ? palette.dark : palette.light;

    const heatmapData = useMemo(() => {
        const stats = getDailyStats(tasks);
        return Object.values(stats).map((stat) => ({
            date: stat.date.replace(/-/g, "/"), // uiw/react-heat-map uses YYYY/MM/DD
            count: stat.score,
            rate: stat.rate,
            totalDone: stat.totalDone,
            totalPlanned: stat.totalPlanned,
        }));
    }, [tasks]);

    // year나 month가 주어지면 해당 기간으로, 아니면 올해 전체로 설정
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const startDate = month
        ? new Date(`${currentYear}-${month.padStart(2, "0")}-01`)
        : new Date(`${currentYear}-01-01`);

    // 종료일은 월말 또는 연말
    const endDate = month
        ? new Date(currentYear, parseInt(month, 10), 0)
        : new Date(`${currentYear}-12-31`);

    if (!mounted) {
        return (
            <div className="w-full overflow-x-auto p-4 bg-card text-card-foreground rounded-xl border shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-center sm:text-left">
                    {month ? `${currentYear}년 ${month}월 히트맵` : `${currentYear} 연간 히트맵`} 캘린더
                </h2>
                <div className="min-w-[800px] h-[150px] animate-pulse bg-muted rounded-md" />
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto p-4 bg-card text-card-foreground rounded-xl border shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-center sm:text-left">
                {month ? `${currentYear}년 ${month}월 히트맵 캘린더` : `${currentYear} 연간 히트맵 캘린더`}
            </h2>
            <div className={`min-w-${month ? '[300px]' : '[800px]'}`}>
                <HeatMap
                    value={heatmapData}
                    width="100%"
                    startDate={startDate}
                    endDate={endDate}
                    panelColors={panelColors}
                    rectSize={14}
                    legendCellSize={14}
                    style={{ color: '#a1a1aa' }}
                    rectProps={{
                        rx: 3,
                        ry: 3,
                    }}
                    rectRender={(props, data) => {
                        // @ts-ignore
                        if (!data.count && data.count !== 0) return <rect {...props} />;

                        // @ts-ignore
                        const title = `${data.date.replace(/\//g, "-")}\n달성률: ${data.rate || 0}%\n완료: ${data.totalDone || 0} / ${data.totalPlanned || 0}`;

                        return (
                            <rect {...props}>
                                <title>{title}</title>
                            </rect>
                        );
                    }}
                />
            </div>
        </div>
    );
};

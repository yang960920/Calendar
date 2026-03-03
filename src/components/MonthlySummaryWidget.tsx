"use client";

import React, { useMemo } from "react";
import { Flag } from "lucide-react";

interface MonthlySummaryWidgetProps {
    year: string;
    month: string;
    tasks: { planned: number; done: number }[];
}

export const MonthlySummaryWidget = ({ year, month, tasks }: MonthlySummaryWidgetProps) => {
    // 달 이름을 영문 약어(JAN, FEB 등)로 포맷팅
    const monthName = useMemo(() => {
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    }, [year, month]);

    // 전체 목표/달성/남은 수치 계산
    const { total, done, left, rate } = useMemo(() => {
        let t = 0;
        let d = 0;
        tasks.forEach((task) => {
            t += task.planned;
            d += task.done;
        });
        const l = Math.max(0, t - d); // 남은 수치가 음수가 되지 않도록 방어
        const r = t > 0 ? Math.round((d / t) * 100) : 0;

        return { total: t, done: d, left: l, rate: Math.min(100, r) };
    }, [tasks]);

    return (
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 py-6 px-4 md:px-8 border-b border-border/50">
            {/* 좌측: 타이틀 */}
            <div className="flex-shrink-0 text-center md:text-left">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    {year} <span className="text-foreground">{monthName}</span>
                </h2>
            </div>

            {/* 우측: 상태 지표들 */}
            <div className="flex-1 w-full flex items-start justify-center md:justify-end gap-4 md:gap-12">
                {/* Monthly Status */}
                <div className="flex flex-col items-center">
                    <div className="bg-foreground text-background text-xs font-semibold px-4 py-1.5 rounded-md mb-2">
                        Monthly Status
                    </div>
                    <div className="text-3xl font-bold mb-2">{rate}%</div>
                    {/* Progress Bar with running icon & flag */}
                    <div className="relative w-32 h-1 bg-muted rounded-full flex items-center">
                        {/* 런닝 아이콘 대신 간단한 도형이나 텍스트를 이용해 진행도 표시 */}
                        <div
                            className="absolute z-10 text-[10px] transform -translate-x-1/2 -translate-y-1/2 mt-1"
                            style={{ left: `${rate}%` }}
                        >
                            🏃
                        </div>
                        <div
                            className="h-full bg-foreground rounded-full transition-all duration-500"
                            style={{ width: `${rate}%` }}
                        />
                        <div className="absolute right-0 text-red-500 transform translate-x-1/2 -translate-y-1/2 mt-1.5">
                            <Flag size={14} fill="currentColor" />
                        </div>
                    </div>
                </div>

                {/* Total */}
                <div className="flex flex-col items-center">
                    <div className="bg-foreground text-background text-xs font-semibold px-6 py-1.5 rounded-md mb-2">
                        Total
                    </div>
                    <div className="text-3xl font-bold">{total}</div>
                </div>

                {/* Done */}
                <div className="flex flex-col items-center">
                    <div className="bg-[#a2c8f2] text-black text-xs font-semibold px-6 py-1.5 rounded-md mb-2">
                        Done
                    </div>
                    <div className="text-3xl font-bold text-[#6eaae5]">{done}</div>
                </div>

                {/* Left */}
                <div className="flex flex-col items-center">
                    <div className="bg-[#eaf5b0] text-black text-xs font-semibold px-6 py-1.5 rounded-md mb-2">
                        Left
                    </div>
                    <div className="text-3xl font-bold text-[#c4d651]">{left}</div>
                </div>
            </div>
        </div>
    );
};

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface WidgetPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function WidgetPagination({ currentPage, totalPages, onPageChange }: WidgetPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 pt-2 border-t mt-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-muted-foreground tabular-nums">
                {currentPage} / {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

/** 페이지네이션 유틸리티 */
export function paginate<T>(items: T[], page: number, perPage: number = 5) {
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * perPage;
    return {
        items: items.slice(start, start + perPage),
        totalPages,
        currentPage: safePage,
    };
}

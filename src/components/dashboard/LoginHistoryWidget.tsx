"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getLoginHistory } from "@/app/actions/dashboard";
import { History, Globe } from "lucide-react";
import { format } from "date-fns";
import { WidgetPagination, paginate } from "./WidgetPagination";

interface LoginLog {
    id: string;
    details: string | null;
    createdAt: string;
}

export function LoginHistoryWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!user) return;
        getLoginHistory(user.id).then((res) => {
            if (res.success && res.data) {
                setLogs(res.data.map((l: any) => ({
                    ...l,
                    createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
                })));
            }
        });
    }, [user]);

    const { items: pageItems, totalPages, currentPage } = paginate(logs, page);

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold">최근 접속 기록</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                {pageItems.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-8">
                        접속 기록이 없습니다
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pageItems.map((log) => (
                            <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-sm">
                                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground truncate">{log.details || "로그인"}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatLoginTime(log.createdAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <WidgetPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

function formatLoginTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return `오늘 ${format(d, "HH:mm")}`;
        return format(d, "MM/dd HH:mm");
    } catch { return ""; }
}

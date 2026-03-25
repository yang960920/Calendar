"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getMyNotifications, markAsRead, markAllAsRead } from "@/app/actions/notification";
import { Mail, CheckCheck, Megaphone, Clock, AlertTriangle } from "lucide-react";
import { WidgetPagination, paginate } from "./WidgetPagination";

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    senderId?: string;
    createdAt: string;
}

export function MailWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        getMyNotifications(user.id).then((res) => {
            if (res.success) {
                setNotifications(res.data);
            }
            setLoading(false);
        });
    }, [user]);

    const handleRead = async (id: string) => {
        await markAsRead(id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    };

    const handleReadAll = async () => {
        if (!user) return;
        await markAllAsRead(user.id);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "NUDGE": return <Megaphone className="h-4 w-4 text-red-500" />;
            case "DEADLINE": return <Clock className="h-4 w-4 text-amber-500" />;
            default: return <AlertTriangle className="h-4 w-4 text-blue-500" />;
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    const { items: pageItems, totalPages, currentPage } = paginate(notifications, page);

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            {/* 헤더 — 기존 NotificationBell 스타일 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-bold">알림</h3>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button onClick={handleReadAll} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <CheckCheck className="h-3 w-3" /> 모두 읽음
                    </button>
                )}
            </div>

            {/* 알림 목록 — NotificationBell 동일 형태 */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-8">로딩 중...</div>
                ) : pageItems.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-8">
                        알림이 없습니다
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {pageItems.map((n) => (
                            <div
                                key={n.id}
                                className={`px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer flex gap-3 ${
                                    !n.isRead ? "bg-primary/5" : ""
                                }`}
                                onClick={() => !n.isRead && handleRead(n.id)}
                            >
                                <div className="mt-0.5">{getIcon(n.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${!n.isRead ? "font-semibold" : ""}`}>{n.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                                </div>
                                {!n.isRead && (
                                    <div className="mt-1"><div className="h-2 w-2 rounded-full bg-primary" /></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <WidgetPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

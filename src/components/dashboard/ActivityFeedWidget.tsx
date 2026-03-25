"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getActivityFeed } from "@/app/actions/dashboard";
import { Rss, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { WidgetPagination, paginate } from "./WidgetPagination";

interface FeedItem {
    id: string;
    action: string;
    entityType: string;
    details: string | null;
    user: { id: string; name: string; profileImageUrl: string | null };
    project: { name: string } | null;
    createdAt: string;
}

const actionLabels: Record<string, string> = {
    CREATED_TASK: "업무를 생성했습니다",
    UPDATED_TASK: "업무를 수정했습니다",
    DELETED_TASK: "업무를 삭제했습니다",
    CREATED_PROJECT: "프로젝트를 생성했습니다",
    UPDATED_PROJECT: "프로젝트를 수정했습니다",
    COMPLETED_TASK: "업무를 완료했습니다",
    UPDATED_PROJECT_STATUS: "프로젝트 상태를 변경했습니다",
    ADDED_SUBTASK: "하위 업무를 추가했습니다",
    COMPLETED_SUBTASK: "하위 업무를 완료했습니다",
};

export function ActivityFeedWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const router = useRouter();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!user) return;
        getActivityFeed(user.id).then((res) => {
            if (res.success && res.data) {
                setFeed(res.data.map((f: any) => ({
                    ...f,
                    createdAt: f.createdAt?.toISOString?.() ?? f.createdAt,
                })));
            }
        });
    }, [user]);

    const { items: pageItems, totalPages, currentPage } = paginate(feed, page);

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Rss className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-bold">활동 피드</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                {pageItems.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-8">
                        활동 내역이 없습니다
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pageItems.map((item) => (
                            <div key={item.id} className="flex items-start gap-2.5 text-sm">
                                {item.user.profileImageUrl ? (
                                    <img src={item.user.profileImageUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5" />
                                ) : (
                                    <UserCircle className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs">
                                        <span className="font-semibold">{item.user.name}</span>
                                        <span className="text-muted-foreground"> {actionLabels[item.action] || item.action}</span>
                                    </p>
                                    {item.project && (
                                        <p
                                            className="text-[10px] text-primary/70 hover:text-primary truncate cursor-pointer"
                                            onClick={() => router.push("/projects")}
                                        >
                                            {item.project.name}
                                        </p>
                                    )}
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatFeedTime(item.createdAt)}
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

function formatFeedTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "방금";
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`;
        return format(d, "MM/dd");
    } catch { return ""; }
}

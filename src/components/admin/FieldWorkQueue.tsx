"use client";

import { useState } from "react";
import { Briefcase, Check, X, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FieldWorkRequest {
    id: string;
    userId: string;
    userName: string;
    department: string;
    date: string;
    reason: string;
    status: string;
    rejectedReason?: string | null;
    createdAt: string;
}

interface Props {
    requests: FieldWorkRequest[];
    onApprove: (id: string) => void;
    onReject: (id: string, reason?: string) => void;
}

export function FieldWorkQueue({ requests, onApprove, onReject }: Props) {
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const handleReject = (id: string) => {
        if (rejectingId === id) {
            onReject(id, rejectReason);
            setRejectingId(null);
            setRejectReason("");
        } else {
            setRejectingId(id);
        }
    };

    if (requests.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
                <p className="text-zinc-400 font-medium">외근 신청 대기열이 비어있습니다</p>
                <p className="text-xs text-zinc-500 mt-1">직원들의 외근 신청이 들어오면 여기에 표시됩니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {requests.map((req) => (
                <div key={req.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{req.userName}</span>
                                <span className="text-xs text-zinc-500">{req.department}</span>
                                <StatusBadge status={req.status} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {req.date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {req.reason}
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-500">
                                신청일: {new Date(req.createdAt).toLocaleString("ko-KR")}
                            </p>

                            {/* 반려 사유 입력 */}
                            {rejectingId === req.id && (
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        placeholder="반려 사유 입력 (선택)"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        {req.status === "PENDING" && (
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 h-8"
                                    onClick={() => onApprove(req.id)}
                                >
                                    <Check className="h-3 w-3 mr-1" />승인
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-red-600/50 text-red-400 hover:bg-red-600/10 h-8"
                                    onClick={() => handleReject(req.id)}
                                >
                                    <X className="h-3 w-3 mr-1" />{rejectingId === req.id ? "확인" : "반려"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "APPROVED") return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">승인</span>;
    if (status === "REJECTED") return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">반려</span>;
    return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">대기</span>;
}

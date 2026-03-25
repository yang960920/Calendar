"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/hooks/useStore";
import { getTodayAttendance, clockOut } from "@/app/actions/attendance";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

type AttendanceStatus = "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";

export function WorkClockWidget() {
    const user = useStore(useAuthStore, (s) => s.user);
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<AttendanceStatus>("NOT_CLOCKED_IN");
    const [clockInTime, setClockInTime] = useState<Date | null>(null);
    const [clockOutTimeStr, setClockOutTimeStr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // 실시간 시계
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 출퇴근 상태 조회
    useEffect(() => {
        if (!user) return;
        getTodayAttendance(user.id).then((res) => {
            if (res.success && res.data) {
                const ci = new Date(res.data.clockIn);
                setClockInTime(ci);
                if (res.data.clockOut) {
                    const co = new Date(res.data.clockOut);
                    setClockOutTimeStr(co.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
                    setStatus("CLOCKED_OUT");
                } else {
                    setStatus("CLOCKED_IN");
                }
            } else {
                setStatus("NOT_CLOCKED_IN");
            }
        });
    }, [user]);

    const handleClockOut = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await clockOut(user.id);
            if (res.success) {
                setStatus("CLOCKED_OUT");
                setClockOutTimeStr(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    // 근무 경과 시간 계산
    const getElapsedTime = () => {
        if (!clockInTime || status !== "CLOCKED_IN") return null;
        const diffMs = time.getTime() - clockInTime.getTime();
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        return `${hours}시간 ${mins}분`;
    };

    const hours = time.getHours().toString().padStart(2, "0");
    const minutes = time.getMinutes().toString().padStart(2, "0");
    const seconds = time.getSeconds().toString().padStart(2, "0");
    const elapsed = getElapsedTime();

    return (
        <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold">근무 체크</h3>
            </div>

            {/* 상태 뱃지 */}
            <div className="flex justify-center mb-2">
                <StatusBadge status={status} />
            </div>

            {/* 시계 */}
            <div className="text-center mb-2">
                <div className="text-3xl font-mono font-bold tracking-wider">
                    <span>{hours}</span>
                    <span className="animate-pulse">:</span>
                    <span>{minutes}</span>
                    <span className="animate-pulse">:</span>
                    <span className="text-muted-foreground">{seconds}</span>
                </div>
            </div>

            {/* 경과 시간 */}
            {elapsed && (
                <p className="text-center text-xs text-primary/70 mb-2">근무 {elapsed}</p>
            )}

            {/* 출퇴근 시간 */}
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
                {clockInTime && (
                    <span className="flex items-center gap-1">
                        <LogIn className="h-3 w-3 text-emerald-400" /> 출근 {clockInTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                )}
                {clockOutTimeStr && (
                    <span className="flex items-center gap-1">
                        <LogOut className="h-3 w-3 text-orange-400" /> 퇴근 {clockOutTimeStr}
                    </span>
                )}
            </div>

            {/* 하단 */}
            <div className="mt-auto flex gap-2">
                {status === "CLOCKED_IN" && (
                    <Button variant="outline" size="sm" onClick={handleClockOut} disabled={loading} className="w-full text-xs">
                        <LogOut className="h-3 w-3 mr-1" />
                        {loading ? "처리 중..." : "퇴근하기"}
                    </Button>
                )}
                {status === "NOT_CLOCKED_IN" && (
                    <div className="w-full text-center text-xs text-muted-foreground">
                        <Coffee className="h-4 w-4 mx-auto mb-1 opacity-50" />
                        로그인 시 자동 출근됩니다
                    </div>
                )}
                {status === "CLOCKED_OUT" && (
                    <div className="w-full text-center text-xs text-emerald-400">✓ 오늘 근무 완료</div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
    if (status === "CLOCKED_IN") return <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">출근 중</span>;
    if (status === "CLOCKED_OUT") return <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-400">퇴근</span>;
    return <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/20 text-zinc-400">출근 전</span>;
}

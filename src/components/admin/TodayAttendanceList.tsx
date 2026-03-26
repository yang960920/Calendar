"use client";

import { useState } from "react";
import { Users, Clock, UserCheck, UserX, LogOut as LogOutIcon } from "lucide-react";
import { updateUserWorkTime } from "@/app/actions/admin-attendance";

interface AttendanceItem {
    userId: string;
    name: string;
    department: string;
    clockIn: string | null;
    clockOut: string | null;
    status: string;
    deviceId: string | null;
    workStartTime: string | null;
    workEndTime: string | null;
}

interface Summary {
    total: number;
    present: number;
    late: number;
    absent: number;
    clockedOut: number;
}

export function TodayAttendanceList({ data, summary, onRefresh }: { data: AttendanceItem[]; summary: Summary; onRefresh: () => void }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AttendanceItem | null>(null);
    const [editStart, setEditStart] = useState("09:00");
    const [editEnd, setEditEnd] = useState("18:00");
    const [isLoading, setIsLoading] = useState(false);

    const formatTime = (iso: string | null) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PRESENT":
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">🟢 근무중</span>;
            case "LATE":
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400">🟡 지각</span>;
            case "CLOCKED_OUT":
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/20 text-zinc-400">⚪ 퇴근</span>;
            case "ABSENT":
            default:
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400">🔴 미출근</span>;
        }
    };

    const handleSaveTime = async () => {
        if (!selectedUser) return;
        setIsLoading(true);
        const res = await updateUserWorkTime(selectedUser.userId, editStart, editEnd);
        setIsLoading(false);
        if (res.success) {
            setIsModalOpen(false);
            onRefresh();
        } else {
            alert("저장 실패");
        }
    };

    return (
        <div className="space-y-4">
            {/* 요약 패널 */}
            <div className="grid grid-cols-5 gap-3">
                <SummaryCard icon={Users} label="전체" value={summary.total} color="text-zinc-300" />
                <SummaryCard icon={UserCheck} label="출근" value={summary.present} color="text-emerald-400" />
                <SummaryCard icon={Clock} label="지각" value={summary.late} color="text-amber-400" />
                <SummaryCard icon={UserX} label="미출근" value={summary.absent} color="text-red-400" />
                <SummaryCard icon={LogOutIcon} label="퇴근" value={summary.clockedOut} color="text-zinc-400" />
            </div>

            {/* 새로고침 */}
            <div className="flex justify-end">
                <button onClick={onRefresh} className="text-xs text-indigo-400 hover:underline">↻ 새로고침</button>
            </div>

            {/* 테이블 */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-900/80 text-zinc-400 text-xs">
                            <th className="text-left px-4 py-3 font-medium">이름</th>
                            <th className="text-left px-4 py-3 font-medium">부서</th>
                            <th className="text-center px-4 py-3 font-medium">기준 시간</th>
                            <th className="text-center px-4 py-3 font-medium">출근</th>
                            <th className="text-center px-4 py-3 font-medium">퇴근</th>
                            <th className="text-center px-4 py-3 font-medium">상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.userId} className="border-t border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                <td className="px-4 py-3 font-medium">{item.name}</td>
                                <td className="px-4 py-3 text-zinc-400">{item.department}</td>
                                <td className="px-4 py-3 text-center text-zinc-400">
                                    <div className="text-[12px]">{item.workStartTime || "09:00"} ~ {item.workEndTime || "18:00"}</div>
                                    <button
                                        onClick={() => {
                                            setSelectedUser(item);
                                            setEditStart(item.workStartTime || "09:00");
                                            setEditEnd(item.workEndTime || "18:00");
                                            setIsModalOpen(true);
                                        }}
                                        className="text-[10px] text-indigo-400 hover:underline mt-0.5"
                                    >
                                        변경
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-center text-emerald-400">{formatTime(item.clockIn)}</td>
                                <td className="px-4 py-3 text-center text-orange-400">{formatTime(item.clockOut)}</td>
                                <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 근무 시간 설정 모달 */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-80 shadow-xl">
                        <h3 className="text-lg font-bold mb-4">{selectedUser.name} - 근무 시간 설정</h3>
                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="block text-zinc-400 mb-1">출근 기준 시간</label>
                                <input
                                    type="time"
                                    value={editStart}
                                    onChange={(e) => setEditStart(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 mb-1">퇴근 기준 시간</label>
                                <input
                                    type="time"
                                    value={editEnd}
                                    onChange={(e) => setEditEnd(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-white">취소</button>
                            <button
                                onClick={handleSaveTime}
                                disabled={isLoading}
                                className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                            >
                                {isLoading ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
        </div>
    );
}

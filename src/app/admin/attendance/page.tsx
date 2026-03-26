"use client";

import { useEffect, useState } from "react";
import { getTodayAttendanceList, getMonthlyAttendanceReport } from "@/app/actions/admin-attendance";
import { getPendingDevicesAdmin, approveDeviceAdmin, rejectDeviceAdmin } from "@/app/actions/device-auth";
import { getFieldWorkRequests, approveFieldWork, rejectFieldWork } from "@/app/actions/field-work";
import { TodayAttendanceList } from "@/components/admin/TodayAttendanceList";
import { MonthlyAttendanceTable } from "@/components/admin/MonthlyAttendanceTable";
import { DeviceApprovalQueue } from "@/components/admin/DeviceApprovalQueue";
import { FieldWorkQueue } from "@/components/admin/FieldWorkQueue";

type TabType = "today" | "monthly" | "devices" | "fieldwork";

export default function AdminAttendancePage() {
    const [activeTab, setActiveTab] = useState<TabType>("today");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [todayData, setTodayData] = useState<any[]>([]);
    const [todaySummary, setTodaySummary] = useState({ total: 0, present: 0, late: 0, absent: 0, clockedOut: 0 });

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [daysInMonth, setDaysInMonth] = useState(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingDevices, setPendingDevices] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [fieldRequests, setFieldRequests] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === "today") {
            loadToday();
        } else if (activeTab === "monthly") {
            loadMonthly();
        } else if (activeTab === "devices") {
            loadDevices();
        } else if (activeTab === "fieldwork") {
            loadFieldWork();
        }
    }, [activeTab, selectedYear, selectedMonth]);

    const loadToday = async () => {
        const res = await getTodayAttendanceList();
        if (res.success) {
            setTodayData(res.data);
            setTodaySummary(res.summary);
        }
    };

    const loadMonthly = async () => {
        const res = await getMonthlyAttendanceReport(selectedYear, selectedMonth);
        if (res.success) {
            setMonthlyData(res.data);
            setDaysInMonth(res.daysInMonth);
        }
    };

    const loadDevices = async () => {
        const res = await getPendingDevicesAdmin();
        if (res.success) {
            setPendingDevices(res.data);
        }
    };

    const loadFieldWork = async () => {
        const res = await getFieldWorkRequests("PENDING");
        if (res.success) {
            setFieldRequests(res.data || []);
        }
    };

    const handleApprove = async (tokenId: string) => {
        const res = await approveDeviceAdmin(tokenId);
        if (res.success) {
            setPendingDevices(prev => prev.filter(d => d.id !== tokenId));
        }
    };

    const handleReject = async (tokenId: string) => {
        if (!confirm("이 기기 등록 요청을 거절하시겠습니까?")) return;
        const res = await rejectDeviceAdmin(tokenId);
        if (res.success) {
            setPendingDevices(prev => prev.filter(d => d.id !== tokenId));
        }
    };

    const handleFieldApprove = async (requestId: string) => {
        const res = await approveFieldWork(requestId);
        if (res.success) {
            setFieldRequests(prev => prev.filter(r => r.id !== requestId));
        } else {
            alert(res.error);
        }
    };

    const handleFieldReject = async (requestId: string, reason?: string) => {
        const res = await rejectFieldWork(requestId, reason);
        if (res.success) {
            setFieldRequests(prev => prev.filter(r => r.id !== requestId));
        } else {
            alert(res.error);
        }
    };

    const tabs = [
        { key: "today" as TabType, label: "오늘 근태 현황" },
        { key: "monthly" as TabType, label: "월간 리포트" },
        { key: "devices" as TabType, label: `기기 승인${pendingDevices.length > 0 ? ` (${pendingDevices.length})` : ""}` },
        { key: "fieldwork" as TabType, label: `외근 승인${fieldRequests.length > 0 ? ` (${fieldRequests.length})` : ""}` },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">근태 관리</h1>
                <p className="text-sm text-zinc-400 mt-1">직원 출퇴근 현황, 기기 및 외근 관리</p>
            </div>

            <div className="flex gap-1 border-b border-zinc-800 pb-0">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                            activeTab === tab.key
                                ? "text-indigo-400 border-indigo-400"
                                : "text-zinc-500 border-transparent hover:text-zinc-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "today" && (
                <TodayAttendanceList data={todayData} summary={todaySummary} onRefresh={loadToday} />
            )}
            {activeTab === "monthly" && (
                <MonthlyAttendanceTable
                    data={monthlyData}
                    daysInMonth={daysInMonth}
                    year={selectedYear}
                    month={selectedMonth}
                    onYearChange={setSelectedYear}
                    onMonthChange={setSelectedMonth}
                />
            )}
            {activeTab === "devices" && (
                <DeviceApprovalQueue
                    devices={pendingDevices}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
            {activeTab === "fieldwork" && (
                <FieldWorkQueue
                    requests={fieldRequests}
                    onApprove={handleFieldApprove}
                    onReject={handleFieldReject}
                />
            )}
        </div>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { FileBarChart, Plus, Trash2, Mail, Download, ChevronDown, Loader2, Send, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    generateReportSet,
    sendReportSetEmail,
    getReportSets,
    getReportsBySet,
    getReportRecipients,
    addReportRecipient,
    removeReportRecipient,
    toggleReportRecipient,
} from "@/app/actions/report";
import {
    getAllProjectReportsForAdmin,
    getUnreportedProjects,
    generateProjectReportManual,
    regenerateProjectReport,
    confirmProjectReport,
} from "@/app/actions/project-report";

type Tab = "history" | "recipients" | "settings" | "project";

interface ReportSetItem {
    id: string;
    type: string;
    periodLabel: string;
    status: string;
    reportCount: number;
    createdAt: string;
    sentAt: string | null;
    stats: any;
}

interface ReportItem {
    id: string;
    scope: string;
    scopeLabel: string;
    pdfUrl: string | null;
    aiInsight: string | null;
    stats: any;
}

interface Recipient {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    GENERATING: { label: "생성 중", color: "bg-yellow-500/20 text-yellow-400", icon: Loader2 },
    GENERATED: { label: "생성 완료", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle2 },
    SENDING: { label: "발송 중", color: "bg-purple-500/20 text-purple-400", icon: Send },
    SENT: { label: "발송 완료", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
    FAILED: { label: "실패", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

export default function AdminReportsPage() {
    const [tab, setTab] = useState<Tab>("history");
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [reportSets, setReportSets] = useState<ReportSetItem[]>([]);
    const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
    const [expandedReports, setExpandedReports] = useState<ReportItem[]>([]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // 성과 보고서 상태
    const [projectReports, setProjectReports] = useState<any[]>([]);
    const [unreportedProjects, setUnreportedProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [generatingProject, setGeneratingProject] = useState(false);
    const [detailReport, setDetailReport] = useState<any | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [setsRes, recipRes] = await Promise.all([
            getReportSets(1, 20),
            getReportRecipients(),
        ]);
        if (setsRes.success) setReportSets(setsRes.data);
        if (recipRes.success) setRecipients(recipRes.data);
        // 성과 보고서 로드
        const [prRes, upRes] = await Promise.all([
            getAllProjectReportsForAdmin(),
            getUnreportedProjects(),
        ]);
        if (prRes.success && prRes.data) setProjectReports(prRes.data);
        if (upRes.success && upRes.data) setUnreportedProjects(upRes.data);
        setLoading(false);
    };

    const handleGenerate = async (type: "WEEKLY" | "MONTHLY") => {
        setGenerating(true);
        setMessage({ type: "success", text: `${type === "WEEKLY" ? "주간" : "월간"} 리포트 생성 중... AI 분석 및 PDF 생성이 진행됩니다.` });
        const res = await generateReportSet(type);
        if (res.success) {
            setMessage({ type: "success", text: "✅ 리포트 생성 완료!" });
            loadData();
        } else {
            setMessage({ type: "error", text: res.error || "생성 실패" });
        }
        setGenerating(false);
    };

    const handleSendEmail = async (setId: string) => {
        setMessage({ type: "success", text: "이메일 발송 중..." });
        const res = await sendReportSetEmail(setId);
        if (res.success) {
            setMessage({ type: "success", text: `✅ ${res.sentCount}명에게 발송 완료!` });
            loadData();
        } else {
            setMessage({ type: "error", text: res.error || "발송 실패" });
        }
    };

    const handleExpand = async (setId: string) => {
        if (expandedSetId === setId) {
            setExpandedSetId(null);
            return;
        }
        setExpandedSetId(setId);
        const res = await getReportsBySet(setId);
        if (res.success) setExpandedReports(res.data);
    };

    const handleAddRecipient = async () => {
        if (!newEmail || !newName) return;
        const res = await addReportRecipient(newEmail.trim(), newName.trim());
        if (res.success) {
            setNewEmail("");
            setNewName("");
            loadData();
        } else {
            setMessage({ type: "error", text: res.error || "추가 실패" });
        }
    };

    const handleRemoveRecipient = async (id: string) => {
        if (!confirm("수신자를 삭제하시겠습니까?")) return;
        await removeReportRecipient(id);
        loadData();
    };

    const handleToggleRecipient = async (id: string, isActive: boolean) => {
        await toggleReportRecipient(id, isActive);
        setRecipients(prev => prev.map(r => r.id === id ? { ...r, isActive } : r));
    };

    // 성과 보고서 핸들러
    const handleGenerateProjectReport = async () => {
        if (!selectedProjectId) return;
        setGeneratingProject(true);
        setMessage({ type: "success", text: "성과 보고서 생성 중... AI 분석 및 PDF 생성이 진행됩니다." });
        const res = await generateProjectReportManual(selectedProjectId);
        if (res.success) {
            setMessage({ type: "success", text: "성과 보고서 생성 완료!" });
            setSelectedProjectId("");
            loadData();
        } else {
            setMessage({ type: "error", text: res.error || "생성 실패" });
        }
        setGeneratingProject(false);
    };

    const handleRegenerateProject = async (projectId: string) => {
        setMessage({ type: "success", text: "재생성 중..." });
        const res = await regenerateProjectReport(projectId);
        if (res.success) {
            setMessage({ type: "success", text: "재생성 완료!" });
            loadData();
            setDetailReport(null);
        } else {
            setMessage({ type: "error", text: res.error || "재생성 실패" });
        }
    };

    const handleConfirmProject = async (reportId: string) => {
        const res = await confirmProjectReport(reportId);
        if (res.success) {
            setMessage({ type: "success", text: "확인 완료 처리되었습니다." });
            loadData();
            setDetailReport(null);
        } else {
            setMessage({ type: "error", text: res.error || "실패" });
        }
    };

    const prStatusConfig: Record<string, { label: string; color: string }> = {
        GENERATING: { label: "생성 중", color: "bg-yellow-500/20 text-yellow-400" },
        GENERATED: { label: "대기중", color: "bg-blue-500/20 text-blue-400" },
        SUBMITTED: { label: "제출됨", color: "bg-green-500/20 text-green-400" },
        CONFIRMED: { label: "확인완료", color: "bg-zinc-500/20 text-zinc-400" },
    };

    const tabs = [
        { id: "history" as Tab, label: "리포트 이력" },
        { id: "recipients" as Tab, label: "수신자 관리" },
        { id: "project" as Tab, label: "성과 보고서" },
        { id: "settings" as Tab, label: "설정" },
    ];

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileBarChart className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-2xl font-bold text-white">리포트 관리</h1>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => handleGenerate("WEEKLY")}
                        disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        주간 리포트 생성
                    </Button>
                    <Button
                        onClick={() => handleGenerate("MONTHLY")}
                        disabled={generating}
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
                    >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        월간 리포트 생성
                    </Button>
                </div>
            </div>

            {/* 메시지 */}
            {message && (
                <div className={`px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {message.text}
                </div>
            )}

            {/* 탭 */}
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${tab === t.id ? "bg-zinc-700 text-white font-medium" : "text-zinc-400 hover:text-white"}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 탭 컨텐츠 */}
            {tab === "history" && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-zinc-500">로딩 중...</div>
                    ) : reportSets.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <FileBarChart className="mx-auto h-12 w-12 mb-3 opacity-30" />
                            <p>생성된 리포트가 없습니다.</p>
                            <p className="text-xs mt-1">상단 버튼으로 리포트를 생성하세요.</p>
                        </div>
                    ) : (
                        reportSets.map(set => {
                            const cfg = statusConfig[set.status] || statusConfig.FAILED;
                            const StatusIcon = cfg.icon;
                            return (
                                <div key={set.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-4">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white">{set.periodLabel}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800">
                                                        {set.type === "WEEKLY" ? "주간" : "월간"}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                                                    <span>리포트 {set.reportCount}건</span>
                                                    <span>생성: {new Date(set.createdAt).toLocaleString("ko-KR")}</span>
                                                    {set.sentAt && <span>발송: {new Date(set.sentAt).toLocaleString("ko-KR")}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(set.status === "GENERATED" || set.status === "SENT") && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-zinc-400 hover:text-white gap-1"
                                                    onClick={() => handleSendEmail(set.id)}
                                                >
                                                    <Mail className="h-3.5 w-3.5" />
                                                    이메일 발송
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-zinc-400 hover:text-white gap-1"
                                                onClick={() => handleExpand(set.id)}
                                            >
                                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSetId === set.id ? "rotate-180" : ""}`} />
                                                상세
                                            </Button>
                                        </div>
                                    </div>

                                    {expandedSetId === set.id && (
                                        <div className="border-t border-zinc-800 px-5 py-4 bg-zinc-950 space-y-4">
                                            {["COMPANY", "DEPARTMENT", "INDIVIDUAL"].map(scope => {
                                                const reports = expandedReports.filter(r => r.scope === scope);
                                                if (reports.length === 0) return null;
                                                const scopeLabel = scope === "COMPANY" ? "📊 전사 종합" : scope === "DEPARTMENT" ? "🏢 부서별" : "👤 개인별";
                                                return (
                                                    <div key={scope}>
                                                        <h4 className="text-xs font-semibold text-zinc-400 mb-2">{scopeLabel}</h4>
                                                        <div className="space-y-1">
                                                            {reports.map(r => (
                                                                <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded bg-zinc-900 hover:bg-zinc-800 transition-colors">
                                                                    <span className="text-sm text-zinc-300">{r.scopeLabel}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {r.aiInsight && (
                                                                            <span className="text-[10px] text-zinc-500 max-w-[300px] truncate">{r.aiInsight.slice(0, 80)}...</span>
                                                                        )}
                                                                        {r.pdfUrl && (
                                                                            <a
                                                                                href={r.pdfUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/20 text-indigo-400 text-xs hover:bg-indigo-600/30 transition-colors"
                                                                            >
                                                                                <Download className="h-3 w-3" />
                                                                                PDF
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {tab === "recipients" && (
                <div className="space-y-4">
                    {/* 추가 폼 */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-zinc-400 mb-1 block">이름</label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="수신자 이름"
                                className="bg-zinc-900 border-zinc-700 text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-zinc-400 mb-1 block">이메일</label>
                            <Input
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="bg-zinc-900 border-zinc-700 text-white"
                            />
                        </div>
                        <Button onClick={handleAddRecipient} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
                            <Plus className="h-4 w-4" />
                            추가
                        </Button>
                    </div>

                    {/* 수신자 목록 */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400">
                                    <th className="px-5 py-3 text-left">이름</th>
                                    <th className="px-5 py-3 text-left">이메일</th>
                                    <th className="px-5 py-3 text-center">활성</th>
                                    <th className="px-5 py-3 text-center">액션</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipients.map(r => (
                                    <tr key={r.id} className="border-b border-zinc-800 last:border-0">
                                        <td className="px-5 py-3 text-zinc-200">{r.name}</td>
                                        <td className="px-5 py-3 text-zinc-400">{r.email}</td>
                                        <td className="px-5 py-3 text-center">
                                            <Switch
                                                checked={r.isActive}
                                                onCheckedChange={(v: boolean) => handleToggleRecipient(r.id, v)}
                                            />
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <button
                                                onClick={() => handleRemoveRecipient(r.id)}
                                                className="p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {recipients.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">수신자가 없습니다. 위에서 추가하세요.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "settings" && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">자동 발송 스케줄</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800">
                                <div>
                                    <p className="text-sm text-white">주간 리포트</p>
                                    <p className="text-xs text-zinc-400">매주 금요일 18:00 (KST)</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    Vercel Cron 자동 실행
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800">
                                <div>
                                    <p className="text-sm text-white">월간 리포트</p>
                                    <p className="text-xs text-zinc-400">매월 1일 09:00 (KST)</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    Vercel Cron 자동 실행
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-6">
                        <h3 className="text-sm font-semibold text-white mb-2">환경 설정</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="p-3 rounded bg-zinc-800">
                                <span className="text-zinc-500">이메일 서버</span>
                                <p className="text-zinc-300 mt-1">{process.env.NEXT_PUBLIC_EMAIL_HOST || "smtps.hiworks.com"}</p>
                            </div>
                            <div className="p-3 rounded bg-zinc-800">
                                <span className="text-zinc-500">발신 이메일</span>
                                <p className="text-zinc-300 mt-1">{process.env.NEXT_PUBLIC_EMAIL_FROM || "yanghj@hanmirfe.com"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === "project" && (
                <div className="space-y-4">
                    {/* 수동 생성 */}
                    {unreportedProjects.length > 0 && (
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-zinc-400 mb-1 block">미생성 프로젝트 선택</label>
                                <select
                                    value={selectedProjectId}
                                    onChange={e => setSelectedProjectId(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                                >
                                    <option value="">프로젝트 선택...</option>
                                    {unreportedProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.creatorName}, ~{p.endDate})</option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                onClick={handleGenerateProjectReport}
                                disabled={!selectedProjectId || generatingProject}
                                className="bg-indigo-600 hover:bg-indigo-700 gap-1"
                            >
                                {generatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                수동 생성
                            </Button>
                        </div>
                    )}

                    {/* 테이블 */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400">
                                    <th className="px-4 py-3 text-left">프로젝트명</th>
                                    <th className="px-4 py-3 text-left">기간</th>
                                    <th className="px-4 py-3 text-left">생성자</th>
                                    <th className="px-4 py-3 text-center">완료율</th>
                                    <th className="px-4 py-3 text-center">상태</th>
                                    <th className="px-4 py-3 text-center">원본</th>
                                    <th className="px-4 py-3 text-center">수정본</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectReports.map(r => {
                                    const cfg = prStatusConfig[r.status] || prStatusConfig.GENERATED;
                                    return (
                                        <tr
                                            key={r.id}
                                            className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 cursor-pointer"
                                            onClick={() => setDetailReport(r)}
                                        >
                                            <td className="px-4 py-3 text-zinc-200 font-medium">{r.projectName}</td>
                                            <td className="px-4 py-3 text-zinc-400 text-xs">{r.startDate}~{r.endDate}</td>
                                            <td className="px-4 py-3 text-zinc-400">{r.creatorName}</td>
                                            <td className="px-4 py-3 text-center text-zinc-300">{r.stats?.completionRate || 0}%</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <a
                                                    href={r.originalUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/20 text-indigo-400 text-xs hover:bg-indigo-600/30"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <Download className="h-3 w-3" /> 다운
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {r.revisedUrl ? (
                                                    <a
                                                        href={r.revisedUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600/20 text-green-400 text-xs hover:bg-green-600/30"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <Download className="h-3 w-3" /> 다운
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-zinc-600">--</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {projectReports.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-8 text-center text-zinc-500">
                                            <Award className="mx-auto h-10 w-10 mb-2 opacity-30" />
                                            생성된 성과 보고서가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 상세 다이얼로그 */}
                    {detailReport && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDetailReport(null)}>
                            <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-white">{detailReport.projectName} — 성과 보고서 상세</h3>

                                <div className="space-y-3">
                                    <div className="p-3 rounded bg-zinc-800">
                                        <p className="text-xs text-zinc-400 mb-1">원본 (시스템 생성) — {new Date(detailReport.generatedAt).toLocaleDateString("ko-KR")}</p>
                                        <a href={detailReport.originalUrl} target="_blank" rel="noopener noreferrer"
                                           className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">
                                            <Download className="h-4 w-4" /> 원본 PDF 다운로드
                                        </a>
                                    </div>

                                    {detailReport.revisedUrl ? (
                                        <div className="p-3 rounded bg-zinc-800">
                                            <p className="text-xs text-zinc-400 mb-1">수정본 (생성자 제출) — {detailReport.revisedAt ? new Date(detailReport.revisedAt).toLocaleDateString("ko-KR") : ""}</p>
                                            <a href={detailReport.revisedUrl} target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300">
                                                <Download className="h-4 w-4" /> 수정본 PDF 다운로드
                                            </a>
                                            {detailReport.revisedComment && (
                                                <p className="text-xs text-zinc-400 mt-2 border-t border-zinc-700 pt-2">
                                                    코멘트: {detailReport.revisedComment}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded bg-zinc-800 text-xs text-zinc-500">
                                            수정본 미제출
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2 border-t border-zinc-800">
                                    {detailReport.status !== "CONFIRMED" && (
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleConfirmProject(detailReport.id)}>
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> 확인 완료 처리
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => handleRegenerateProject(detailReport.projectId)}>
                                        <RefreshCw className="h-4 w-4 mr-1" /> 재생성
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-zinc-400 ml-auto" onClick={() => setDetailReport(null)}>
                                        닫기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

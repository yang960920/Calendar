"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { getProjectReportForCreator, generateProjectReportForCreator } from "@/app/actions/project-report";

interface Props {
    projectId: string;
    userId: string;
    projectEndDate: string;
}

export function ProjectReportSection({ projectId, userId, projectEndDate }: Props) {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [comment, setComment] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchReport = async () => {
        setLoading(true);
        const res = await getProjectReportForCreator(projectId, userId);
        if (res.success) {
            setReport(res.data);
        }
        setLoading(false);
    };

    useEffect(() => { fetchReport(); }, [projectId, userId]);

    const handleGenerate = async () => {
        setGenerating(true);
        setMessage(null);
        const res = await generateProjectReportForCreator(projectId, userId);
        if (res.success) {
            setMessage({ type: "success", text: "보고서가 생성되었습니다." });
            await fetchReport();
        } else {
            setMessage({ type: "error", text: res.error || "생성에 실패했습니다." });
        }
        setGenerating(false);
    };

    const handleSubmit = async () => {
        if (!selectedFile) return;
        setSubmitting(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("projectId", projectId);
            formData.append("userId", userId);
            if (comment.trim()) formData.append("comment", comment.trim());

            const res = await fetch("/api/project-report/submit", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ type: "success", text: "수정본이 제출되었습니다." });
                setSelectedFile(null);
                setComment("");
                await fetchReport();
            } else {
                setMessage({ type: "error", text: data.error || "제출에 실패했습니다." });
            }
        } catch {
            setMessage({ type: "error", text: "서버 오류가 발생했습니다." });
        }
        setSubmitting(false);
    };

    // 예상 생성일 (endDate + 6일)
    const expectedDate = new Date(projectEndDate);
    expectedDate.setDate(expectedDate.getDate() + 6);
    const expectedStr = expectedDate.toISOString().slice(0, 10);

    if (loading) {
        return (
            <div className="border border-zinc-800 rounded-xl p-6 mt-6 bg-zinc-900/50">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    성과 보고서 로딩...
                </div>
            </div>
        );
    }

    return (
        <div className="border border-zinc-800 rounded-xl p-6 mt-6 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-zinc-100">성과 보고서</h3>
                </div>
                {report && (
                    <span className="text-sm text-zinc-400">
                        {new Date(report.generatedAt).toLocaleDateString("ko-KR")} 생성
                    </span>
                )}
            </div>

            {/* 메시지 */}
            {message && (
                <div className={`text-sm px-3 py-2 rounded mb-4 ${message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {message.text}
                </div>
            )}

            {/* 미생성 상태 */}
            {!report && (
                <div>
                    <p className="text-sm text-zinc-400 mb-3">
                        피어 리뷰 마감 후 자동 생성됩니다. (예상: {expectedStr})
                    </p>
                    <Button onClick={handleGenerate} disabled={generating} variant="outline" size="sm">
                        {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> 생성 중...</> : "지금 생성"}
                    </Button>
                </div>
            )}

            {/* 생성 완료 */}
            {report && !report.isSubmitted && (
                <div className="space-y-4">
                    <Button
                        onClick={() => window.open(report.pdfUrl, "_blank")}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        <Download className="h-4 w-4 mr-1" /> PDF 다운로드
                    </Button>

                    <p className="text-sm text-zinc-400">
                        수정이 필요하면 다운로드 후 수정하여 아래에서 제출해 주세요.
                    </p>

                    {/* 파일 업로드 */}
                    <div
                        className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files[0];
                            if (f?.type === "application/pdf") setSelectedFile(f);
                        }}
                    >
                        <Upload className="h-6 w-6 text-zinc-500 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400">
                            {selectedFile ? selectedFile.name : "PDF 파일을 드래그하거나 클릭하여 업로드"}
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setSelectedFile(f);
                            }}
                        />
                    </div>

                    {/* 코멘트 */}
                    <textarea
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-500 resize-none"
                        rows={2}
                        placeholder="코멘트 (선택)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />

                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedFile || submitting}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                    >
                        {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> 제출 중...</> : "제출하기"}
                    </Button>
                </div>
            )}

            {/* 제출 완료 */}
            {report && report.isSubmitted && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        제출 완료 ({report.submittedAt ? new Date(report.submittedAt).toLocaleDateString("ko-KR") : ""})
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => window.open(report.pdfUrl, "_blank")}
                            variant="outline"
                            size="sm"
                        >
                            <Download className="h-4 w-4 mr-1" /> PDF 다운로드
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-zinc-200"
                            onClick={() => {
                                setReport({ ...report, isSubmitted: false });
                            }}
                        >
                            수정본 재제출
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

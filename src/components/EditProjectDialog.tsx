"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { useProjectStore, Project } from "@/store/useProjectStore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProject } from "@/app/actions/project";

interface EditProjectDialogProps {
    project: Project;
    userId: string;
}

export const EditProjectDialog = ({ project, userId }: EditProjectDialogProps) => {
    const updateProjectStore = useProjectStore((state) => state.updateProject);
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(project.title);
    const [endDate, setEndDate] = useState(
        project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : ""
    );
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            const result = await updateProject({
                projectId: project.id,
                title: title.trim(),
                endDate,
                userId,
            });

            if (result.success && result.data) {
                // Zustand 로컬 스토어 업데이트
                updateProjectStore(project.id, {
                    title: result.data.name,
                    endDate: result.data.endDate.toISOString(),
                });
                setOpen(false);
            } else {
                alert(result.error || "프로젝트 수정 실패");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    수정
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>프로젝트 수정</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">프로젝트 이름</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="프로젝트 이름"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-endDate">프로젝트 종료일</Label>
                        <Input
                            id="edit-endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            프로젝트 전체의 마감 기한을 변경합니다.
                        </p>
                    </div>

                    <Button type="submit" className="mt-4" disabled={loading}>
                        {loading ? "저장 중..." : "변경사항 저장"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

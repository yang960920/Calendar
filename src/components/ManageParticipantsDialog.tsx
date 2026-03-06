"use client";

import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { useProjectStore, Project } from "@/store/useProjectStore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getEmployees } from "@/app/actions/employee";
import { addProjectParticipants } from "@/app/actions/project";

interface ManageParticipantsDialogProps {
    project: Project;
    userId: string;
}

export const ManageParticipantsDialog = ({ project, userId }: ManageParticipantsDialogProps) => {
    const updateProject = useProjectStore((state) => state.updateProject);
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchUsers() {
            const res = await getEmployees();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        }
        if (open) {
            fetchUsers();
            setSelectedNewParticipants([]);
        }
    }, [open]);

    // 현재 참여 중이지 않고, 생성자도 아닌 사용자만 추가 가능
    const availableUsers = users.filter(
        u => u.id !== project.creatorId && !project.participantIds.includes(u.id)
    );

    const handleToggle = (id: string) => {
        setSelectedNewParticipants(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedNewParticipants.length === 0) {
            alert("추가할 참여자를 선택해주세요.");
            return;
        }

        setLoading(true);
        try {
            const result = await addProjectParticipants({
                projectId: project.id,
                participantIds: selectedNewParticipants,
                userId,
            });

            if (result.success) {
                // Zustand 로컬 스토어 업데이트
                updateProject(project.id, {
                    participantIds: [...project.participantIds, ...selectedNewParticipants],
                });
                setSelectedNewParticipants([]);
                setOpen(false);
            } else {
                alert(result.error || "참여자 추가 실패");
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
                    <UserPlus className="h-3.5 w-3.5" />
                    참여자 관리
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>참여자 관리</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* 현재 참여자 목록 */}
                    <div className="grid gap-2">
                        <Label className="font-semibold">현재 참여자</Label>
                        <div className="flex flex-wrap gap-2 border rounded-md p-3 bg-muted/20">
                            {project.participantIds.length === 0 ? (
                                <p className="text-sm text-muted-foreground">아직 참여자가 없습니다.</p>
                            ) : (
                                project.participantIds.map(pId => {
                                    const u = users.find(u => u.id === pId);
                                    return (
                                        <span key={pId} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            {u ? u.name : pId}
                                        </span>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* 추가 가능한 참여자 목록 */}
                    <div className="grid gap-2 mt-2">
                        <Label className="font-semibold">추가 참여자 선택</Label>
                        <div className="flex flex-col gap-2 mt-1 border rounded-md p-3 bg-muted/20 max-h-48 overflow-y-auto">
                            {availableUsers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">추가 가능한 팀원이 없습니다.</p>
                            ) : (
                                availableUsers.map((u) => (
                                    <div key={u.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`add-user-${u.id}`}
                                            className="w-4 h-4 cursor-pointer"
                                            checked={selectedNewParticipants.includes(u.id)}
                                            onChange={() => handleToggle(u.id)}
                                        />
                                        <Label htmlFor={`add-user-${u.id}`} className="text-sm font-normal cursor-pointer">
                                            {u.name} <span className="text-xs text-muted-foreground">({u.role === "PARTICIPANT" ? "참여자" : "생성자"})</span>
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Button type="submit" className="mt-4" disabled={loading || selectedNewParticipants.length === 0}>
                        {loading ? "추가 중..." : `${selectedNewParticipants.length}명 참여자 추가`}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

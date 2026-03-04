"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEmployee, deleteEmployee } from "@/app/actions/employee";

interface EditEmployeeDialogProps {
    user: any;
    departments: any[];
    onUpdated: () => void;
}

export function EditEmployeeDialog({ user, departments, onUpdated }: EditEmployeeDialogProps) {
    const [open, setOpen] = useState(false);
    const [departmentId, setDepartmentId] = useState<string>(user.departmentId || "none");
    const [isCreator, setIsCreator] = useState(user.role === "CREATOR");
    const [isParticipant, setIsParticipant] = useState(user.role === "CREATOR" || user.role === "PARTICIPANT");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open) {
            setDepartmentId(user.departmentId || "none");
            setIsCreator(user.role === "CREATOR");
            setIsParticipant(user.role === "CREATOR" || user.role === "PARTICIPANT");
        }
    }, [open, user]);

    const handleCreatorChange = (checked: boolean) => {
        setIsCreator(checked);
        if (checked) setIsParticipant(true);
    };

    const handleParticipantChange = (checked: boolean) => {
        setIsParticipant(checked);
        if (isCreator && !checked) setIsParticipant(true);
    };

    const handleSave = async () => {
        const role = isCreator ? "CREATOR" : (isParticipant ? "PARTICIPANT" : "NONE");
        if (role === "NONE") {
            alert("권한을 최소 한 개 이상 선택해주세요.");
            return;
        }

        setIsSaving(true);
        const res = await updateEmployee(user.id, { role, departmentId });
        setIsSaving(false);

        if (res.success) {
            setOpen(false);
            onUpdated();
        } else {
            alert(res.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`정말 ${user.name} 사원을 삭제하시겠습니까?`)) return;
        setIsDeleting(true);
        const res = await deleteEmployee(user.id);
        setIsDeleting(false);

        if (res.success) {
            setOpen(false);
            onUpdated();
        } else {
            alert(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-8 text-xs">
                    수정
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>사원 정보 수정</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {user.name} 님의 부서 및 권한을 수정합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-3">
                        <Label>소속 부서</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="부서 선택" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectItem value="none">소속 없음</SelectItem>
                                {departments.map(dep => (
                                    <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Label className="block mb-2">권한 부여</Label>
                        <div className="flex flex-col gap-3 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id={`edit-creator-${user.id}`}
                                    checked={isCreator}
                                    onCheckedChange={handleCreatorChange}
                                    className="border-zinc-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor={`edit-creator-${user.id}`} className="text-sm font-medium cursor-pointer">생성자 (Creator)</Label>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 mt-4">
                                <Checkbox
                                    id={`edit-participant-${user.id}`}
                                    checked={isParticipant}
                                    onCheckedChange={handleParticipantChange}
                                    disabled={isCreator}
                                    className="border-zinc-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor={`edit-participant-${user.id}`} className="text-sm font-medium cursor-pointer">참여자 (Participant)</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-none">
                        {isDeleting ? "삭제 중..." : "삭제"}
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                            취소
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isSaving ? "저장 중..." : "저장"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

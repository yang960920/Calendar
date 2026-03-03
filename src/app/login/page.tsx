"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const router = useRouter();

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // TODO: Update to use real API endpoint instead of hardcoded users
        alert("데이터베이스 연동 작업 진행 중입니다.");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-lg border">
                {/* 관리자 페이지 바로가기 */}
                <div className="mb-6">
                    <Link href="/admin/login">
                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">관리자 로그인 페이지로 이동</span>
                        </div>
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-primary mb-2">Keeper Calendar</h1>
                    <p className="text-sm text-muted-foreground">업무일지 시스템 로그인이 필요합니다</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">아이디 (성명)</Label>
                        <Input
                            id="id"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                            placeholder="예: 양현준"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">비밀번호 (생년월일 6자리)</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="예: 960920"
                        />
                    </div>

                    <Button type="submit" className="w-full mt-6">
                        로그인
                    </Button>
                </form>
            </div>
        </div>
    );
}

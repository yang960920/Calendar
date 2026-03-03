"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, HARDCODED_USERS } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const router = useRouter();

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userObj = HARDCODED_USERS[id as keyof typeof HARDCODED_USERS];

        if (userObj && userObj.password === password) {
            login({
                id: userObj.id,
                name: userObj.name,
                role: userObj.role,
            });
            // 메인 페이지로 이동
            router.push("/");
        } else {
            alert("아이디 또는 비밀번호가 일치하지 않습니다. 등록된 계정으로 로그인해주세요.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-lg border">
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

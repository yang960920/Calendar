"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 모든 사원 목록을 가져옵니다.
 */
export async function getEmployees() {
    try {
        const users = await prisma.user.findMany({
            include: {
                department: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return { success: true, data: users };
    } catch (error) {
        console.error("Error fetching employees:", error);
        return { success: false, error: "사원 목록을 불러오는 중 오류가 발생했습니다." };
    }
}

/**
 * 새로운 사원을 등록합니다.
 */
export async function createEmployee(data: {
    name: string;
    birthDate: string;
    role: "CREATOR" | "PARTICIPANT" | "NONE";
}) {
    try {
        // ID 중복 체킹
        const existingUser = await prisma.user.findUnique({
            where: { id: data.name },
        });

        if (existingUser) {
            return { success: false, error: "이미 존재하는 이름(ID)입니다." };
        }

        const newUser = await prisma.user.create({
            data: {
                id: data.name,
                name: data.name,
                password: data.birthDate,
                role: data.role === "NONE" ? "PARTICIPANT" : data.role,
            },
        });

        revalidatePath("/admin/employees");
        return { success: true, data: newUser };
    } catch (error) {
        console.error("Error creating employee:", error);
        return { success: false, error: "사원 등록 중 서버 오류가 발생했습니다." };
    }
}
/**
 * 일반 사원 로그인 (ID, PW 검증)
 */
export async function loginUser(id: string, password: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: { department: true }
        });

        if (!user) {
            return { success: false, error: "존재하지 않는 아이디(성명)입니다." };
        }

        if (user.password !== password) {
            return { success: false, error: "비밀번호가 일치하지 않습니다." };
        }

        // 보안상 비밀번호는 제외하고 반환
        const { password: _, ...userWithoutPassword } = user;
        return { success: true, data: userWithoutPassword };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, error: "로그인 처리 중 서버 오류가 발생했습니다." };
    }
}

"use server";

export async function loginAdmin(id: string, password: string) {
    const adminId = process.env.ADMIN_ID;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminId || !adminPassword) {
        console.error("[Admin Auth] 환경변수 ADMIN_ID 또는 ADMIN_PASSWORD가 설정되지 않았습니다.");
        return { success: false, error: "서버 설정 오류입니다. 관리자에게 문의하세요." };
    }

    if (id === adminId && password === adminPassword) {
        return { success: true };
    }

    return { success: false, error: "관리자 아이디 또는 비밀번호가 일치하지 않습니다." };
}

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "CREATOR" | "PARTICIPANT";

export interface User {
    id: string; // The login ID (e.g. 김권찬)
    name: string;
    role: Role;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            login: (userData) =>
                set({
                    user: userData,
                    isAuthenticated: true,
                }),
            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "auth-storage",
        }
    )
);

// 하드코딩된 유저 정보 (추후 DB 연동 예정)
export const HARDCODED_USERS = {
    "김권찬": { id: "김권찬", name: "김권찬", password: "910812", role: "CREATOR" as Role },
    "양현준": { id: "양현준", name: "양현준", password: "960920", role: "PARTICIPANT" as Role },
};

import { Font, StyleSheet } from "@react-pdf/renderer";
import path from "path";

// ── 한글 폰트 등록 ──
const fontPath = path.join(process.cwd(), "public/fonts/NotoSansKR-Variable.ttf");

Font.register({
    family: "NotoSansKR",
    fonts: [
        { src: fontPath, fontWeight: 400 },
        { src: fontPath, fontWeight: 700 },
    ],
});

// ── 색상 토큰 ──
export const colors = {
    primary: "#2563eb",
    primaryLight: "#dbeafe",
    success: "#22c55e",
    successLight: "#dcfce7",
    warning: "#eab308",
    warningLight: "#fef9c3",
    danger: "#ef4444",
    dangerLight: "#fee2e2",
    purple: "#8b5cf6",
    purpleLight: "#ede9fe",
    gray50: "#fafafa",
    gray100: "#f4f4f5",
    gray200: "#e4e4e7",
    gray300: "#d4d4d8",
    gray400: "#a1a1aa",
    gray500: "#71717a",
    gray600: "#52525b",
    gray700: "#3f3f46",
    gray800: "#27272a",
    white: "#ffffff",
};

// 등급별 색상
export const gradeColors: Record<string, string> = {
    S: "#2563eb",
    A: "#22c55e",
    B: "#eab308",
    C: "#f97316",
    D: "#ef4444",
};

// ── 공통 스타일 ──
export const s = StyleSheet.create({
    page: {
        fontFamily: "NotoSansKR",
        fontSize: 11,
        paddingTop: 40,
        paddingBottom: 50,
        paddingHorizontal: 45,
        color: colors.gray800,
    },
    // 헤더
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        paddingBottom: 10,
        marginBottom: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: 700, color: colors.primary },
    headerSub: { fontSize: 10, color: colors.gray500 },
    // 푸터
    footer: {
        position: "absolute",
        bottom: 20,
        left: 45,
        right: 45,
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 8,
        color: colors.gray400,
    },
    // KPI
    kpiRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    kpiCard: {
        flex: 1,
        backgroundColor: colors.gray50,
        borderRadius: 5,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    kpiLabel: { fontSize: 9, color: colors.gray500, marginBottom: 3 },
    kpiValue: { fontSize: 22, fontWeight: 700 },
    kpiSub: { fontSize: 9, color: colors.gray500, marginTop: 2 },
    // 섹션
    section: { fontSize: 15, fontWeight: 700, color: colors.gray800, marginBottom: 8, marginTop: 14 },
    // 테이블
    tHead: {
        flexDirection: "row",
        backgroundColor: colors.gray100,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.gray200,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    tRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    tCell: { fontSize: 10 },
    // 프로그레스 바
    barBg: { height: 12, backgroundColor: colors.gray200, borderRadius: 6 },
    barFill: { height: 12, borderRadius: 6 },
    // 인사이트 박스
    insightBox: {
        backgroundColor: colors.primaryLight,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        borderRadius: 4,
        padding: 12,
        marginTop: 12,
    },
    insightTitle: { fontSize: 12, fontWeight: 700, color: colors.primary, marginBottom: 5 },
    insightText: { fontSize: 10, color: colors.gray700, lineHeight: 1.6 },
    // 등급 뱃지
    gradeBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    gradeText: { fontSize: 14, fontWeight: 700, color: colors.white },
});

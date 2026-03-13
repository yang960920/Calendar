const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

// DB Task 스키마: id, title, description, status(TODO/IN_PROGRESS/DONE), priority(LOW/MEDIUM/HIGH),
//   planned, projectId(REQUIRED), assigneeId, dueDate, endDate, completedAt

const taskTemplates = [
    // 다양한 상태와 우선순위로 50개
    { title: '결제 모듈 API 개발', desc: 'PG사 테스트 환경 연동 및 결제 API 개발', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: '푸시 알림 시스템 설계', desc: 'FCM 기반 알림 아키텍처 설계', status: 'TODO', priority: 'HIGH' },
    { title: '사용자 권한 체계 정비', desc: 'RBAC 모델 재설계 및 적용', status: 'DONE', priority: 'HIGH' },
    { title: '데이터 마이그레이션 계획', desc: '레거시 DB 데이터 이관 전략 수립', status: 'DONE', priority: 'MEDIUM' },
    { title: '부하 테스트 수행', desc: 'k6 기반 성능 테스트 시나리오 작성 및 실행', status: 'TODO', priority: 'MEDIUM' },
    { title: '사용자 매뉴얼 작성', desc: '관리자/일반사용자 가이드 문서 작성', status: 'IN_PROGRESS', priority: 'LOW' },
    { title: '접근성(a11y) 점검', desc: 'WCAG 2.1 기준 접근성 감사', status: 'TODO', priority: 'LOW' },
    { title: '다국어 지원 설계', desc: 'i18n 구조 설계 및 번역 키 정의', status: 'TODO', priority: 'MEDIUM' },
    { title: '대시보드 차트 구현', desc: 'recharts 기반 통계 차트 5종 개발', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: '이메일 템플릿 제작', desc: '초대/알림/보고서 이메일 HTML 템플릿', status: 'DONE', priority: 'MEDIUM' },
    { title: '모바일 반응형 QA', desc: 'iOS/Android 브라우저 호환성 테스트', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: '에러 트래킹 연동', desc: 'Sentry 연동 및 에러 모니터링 설정', status: 'DONE', priority: 'HIGH' },
    { title: '배포 자동화 스크립트', desc: 'Vercel + GitHub Actions 배포 자동화', status: 'DONE', priority: 'MEDIUM' },
    { title: '캐시 전략 수립', desc: 'Redis/CDN 캐시 레이어 설계', status: 'TODO', priority: 'HIGH' },
    { title: '외부 API 연동', desc: '외부 데이터 수집용 API 커넥터 개발', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: '보안 감사 보고서', desc: 'OWASP Top 10 기반 보안 진단 결과 정리', status: 'DONE', priority: 'HIGH' },
    { title: '운영 매뉴얼 작성', desc: '장애 대응 및 복구 절차 문서화', status: 'TODO', priority: 'LOW' },
    { title: '데이터 시각화 개선', desc: '기존 차트 UX 개선 및 인터랙션 추가', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: '로그 수집 체계 구축', desc: 'ELK 스택 도입 검토 및 PoC', status: 'TODO', priority: 'HIGH' },
    { title: '분기 성과 보고서', desc: 'Q1 프로젝트 성과 분석 및 발표 자료', status: 'DONE', priority: 'MEDIUM' },
    { title: '코드 품질 개선', desc: 'SonarQube 연동 및 코드 스멜 제거', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: 'UX 리서치 보고서', desc: '사용성 테스트 결과 정리 및 개선안 도출', status: 'DONE', priority: 'LOW' },
    { title: '인프라 비용 보고', desc: '월간 클라우드 비용 분석 및 최적화 제안', status: 'TODO', priority: 'LOW' },
    { title: 'API 성능 최적화', desc: 'N+1 쿼리 제거 및 인덱스 최적화', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: '릴리즈 노트 작성', desc: 'v1.2.0 릴리즈 변경사항 정리', status: 'DONE', priority: 'LOW' },
    { title: '고객 피드백 분석', desc: '베타 테스트 피드백 분류 및 우선순위화', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: '유닛 테스트 보강', desc: '커버리지 80% 달성 목표 테스트 추가', status: 'TODO', priority: 'MEDIUM' },
    { title: '데이터베이스 인덱싱', desc: '느린 쿼리 분석 및 인덱스 최적화', status: 'DONE', priority: 'HIGH' },
    { title: '모바일 앱 UI 설계', desc: 'React Native UI 컴포넌트 설계', status: 'TODO', priority: 'HIGH' },
    { title: '사내 Wiki 정리', desc: '기술 문서 Wiki 구조 재편', status: 'IN_PROGRESS', priority: 'LOW' },
    { title: '프론트엔드 리팩토링', desc: '컴포넌트 구조 개선 및 중복 코드 제거', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: '백엔드 로깅 강화', desc: 'Winston 로거 셋업 및 로그 포맷 표준화', status: 'DONE', priority: 'MEDIUM' },
    { title: '이벤트 기반 아키텍처 설계', desc: 'Pub/Sub 패턴 도입 검토', status: 'TODO', priority: 'HIGH' },
    { title: '데이터 정합성 검증', desc: '마이그레이션 후 데이터 검증 스크립트 작성', status: 'TODO', priority: 'MEDIUM' },
    { title: '레거시 코드 제거', desc: '미사용 API 엔드포인트 및 유틸 함수 정리', status: 'DONE', priority: 'LOW' },
    { title: '성능 모니터링 대시보드', desc: '서버 응답 시간 + 에러율 실시간 차트', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: '사용자 온보딩 플로우', desc: '신규 가입 후 튜토리얼 화면 설계 및 구현', status: 'TODO', priority: 'MEDIUM' },
    { title: '자동화 테스트 파이프라인', desc: 'Playwright E2E 테스트 CI 연동', status: 'TODO', priority: 'HIGH' },
    { title: '디자인 토큰 시스템', desc: 'CSS 변수 기반 디자인 토큰 체계 구축', status: 'DONE', priority: 'MEDIUM' },
    { title: '문서 버전 관리', desc: '기술 문서 Git 기반 버전 관리 체계 구축', status: 'DONE', priority: 'LOW' },
    { title: '거래처 관리 화면', desc: '거래처 등록/수정/삭제 및 검색 UI', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: '재고 알림 시스템', desc: '안전 재고 하한선 도달 시 알림 발송', status: 'TODO', priority: 'HIGH' },
    { title: '월간 매출 보고서', desc: '프로젝트별 매출 데이터 자동 집계', status: 'DONE', priority: 'MEDIUM' },
    { title: '고객사 대시보드', desc: '고객사 전용 프로젝트 진행현황 대시보드', status: 'TODO', priority: 'HIGH' },
    { title: 'API Rate Limiting', desc: '외부 API 호출 제한 미들웨어 구현', status: 'DONE', priority: 'HIGH' },
    { title: '파일 업로드 리팩토링', desc: 'Vercel Blob 기반 대용량 파일 업로드 개선', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: '멀티 테넌시 설계', desc: '조직별 데이터 격리 아키텍처 설계', status: 'TODO', priority: 'HIGH' },
    { title: '웹훅 시스템 구축', desc: '외부 서비스 연동용 웹훅 발송 기능', status: 'TODO', priority: 'MEDIUM' },
    { title: '감사 로그 개선', desc: '활동 로그 검색 및 필터 UI 개선', status: 'IN_PROGRESS', priority: 'LOW' },
    { title: '연간 보고서 자동화', desc: '연간 성과 보고서 PDF 자동 생성 기능', status: 'TODO', priority: 'MEDIUM' },
];

// 일부 태스크에 붙일 서브태스크
const subTaskMap = {
    0: [
        { title: 'PG사 가입 및 API 키 발급', status: 'DONE', completed: true },
        { title: '결제 테스트 환경 구성', status: 'DONE', completed: true },
        { title: '결제 프로세스 구현', status: 'IN_PROGRESS', completed: false },
        { title: '결제 취소/환불 API', status: 'TODO', completed: false },
    ],
    8: [
        { title: '매출 추이 차트', status: 'DONE', completed: true },
        { title: '카테고리별 비교 차트', status: 'IN_PROGRESS', completed: false },
        { title: '실시간 접속자 차트', status: 'TODO', completed: false },
    ],
    10: [
        { title: 'Safari 호환성 테스트', status: 'DONE', completed: true },
        { title: 'Chrome 모바일 테스트', status: 'IN_PROGRESS', completed: false },
        { title: 'Samsung Browser 테스트', status: 'TODO', completed: false },
    ],
    23: [
        { title: '느린 쿼리 목록 도출', status: 'DONE', completed: true },
        { title: '복합 인덱스 추가', status: 'DONE', completed: true },
        { title: '쿼리 플랜 검증', status: 'IN_PROGRESS', completed: false },
    ],
    35: [
        { title: 'Response Time 차트', status: 'IN_PROGRESS', completed: false },
        { title: 'Error Rate 차트', status: 'TODO', completed: false },
        { title: '알림 규칙 설정', status: 'TODO', completed: false },
    ],
};

async function main() {
    await client.connect();

    // 유저 & 프로젝트 조회
    const usersRes = await client.query('SELECT id, name FROM "User"');
    const users = usersRes.rows;
    const allUserIds = users.map(u => u.id);
    console.log(`유저 ${users.length}명:`, users.map(u => u.name).join(', '));

    const projRes = await client.query('SELECT id, name FROM "Project"');
    const projects = projRes.rows;
    const projectIds = projects.map(p => p.id);
    console.log(`프로젝트 ${projects.length}건:`, projects.map(p => p.name).join(', '));

    if (users.length === 0 || projects.length === 0) {
        console.log('유저 또는 프로젝트가 없어 중단합니다.');
        await client.end();
        return;
    }

    // ===== 태스크 생성 =====
    let taskCount = 0;
    let subTaskCount = 0;
    const createdTaskIds = [];

    for (let i = 0; i < taskTemplates.length; i++) {
        const t = taskTemplates[i];
        const projectId = projectIds[i % projectIds.length];
        const assigneeId = allUserIds[i % allUserIds.length];

        // 1~3월에 걸쳐 분산된 dueDate
        const month = (i % 3) + 1;
        const day = Math.min((i % 28) + 1, 28);
        const dueDate = new Date(`2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

        // endDate: dueDate + 3~10일
        const endDate = new Date(dueDate);
        endDate.setDate(endDate.getDate() + 3 + (i % 8));

        const planned = t.priority === 'HIGH' ? 3 : t.priority === 'MEDIUM' ? 2 : 1;
        const completedAt = t.status === 'DONE' ? new Date() : null;

        const res = await client.query(
            `INSERT INTO "Task" (id, title, description, status, priority, planned, "projectId", "assigneeId", "dueDate", "endDate", "completedAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING id`,
            [t.title, t.desc, t.status, t.priority, planned, projectId, assigneeId, dueDate, endDate, completedAt]
        );
        const taskId = res.rows[0].id;
        createdTaskIds.push(taskId);

        // 복수 담당자 연결
        const assignees = [assigneeId];
        if (i % 4 === 0 && allUserIds.length > 1) assignees.push(allUserIds[(i + 1) % allUserIds.length]);
        if (i % 7 === 0 && allUserIds.length > 2) assignees.push(allUserIds[(i + 2) % allUserIds.length]);
        for (const aId of [...new Set(assignees)]) {
            try {
                await client.query(
                    `INSERT INTO "_TaskAssignees" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [taskId, aId]
                );
            } catch (e) { /* ignore */ }
        }

        taskCount++;

        // 서브태스크 추가
        if (subTaskMap[i]) {
            for (let j = 0; j < subTaskMap[i].length; j++) {
                const st = subTaskMap[i][j];
                const stAssigneeId = allUserIds[(i + j) % allUserIds.length];
                const stDueDate = new Date(dueDate);
                stDueDate.setDate(stDueDate.getDate() + j + 1);
                const stCompletedAt = st.completed ? new Date() : null;

                await client.query(
                    `INSERT INTO "SubTask" (id, title, "isCompleted", status, "taskId", "assigneeId", "dueDate", "completedAt", "createdAt", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
                    [st.title, st.completed, st.status, taskId, stAssigneeId, stDueDate, stCompletedAt]
                );
                subTaskCount++;
            }
        }
    }

    console.log(`\n===== 더미 데이터 추가 완료 =====`);
    console.log(`태스크: ${taskCount}건`);
    console.log(`서브태스크: ${subTaskCount}건`);
    console.log(`================================\n`);
    console.log('⚠️ 브라우저에서 새로고침하면 반영됩니다.');

    await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

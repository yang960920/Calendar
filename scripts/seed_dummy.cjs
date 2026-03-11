const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
    await client.connect();

    // 1. 기존 유저 목록 조회
    const usersRes = await client.query('SELECT id, name, role FROM "User"');
    const users = usersRes.rows;
    console.log('기존 유저:', users.map(u => `${u.id}(${u.role})`).join(', '));

    if (users.length === 0) {
        console.log('유저가 없어 더미 데이터를 생성할 수 없습니다.');
        await client.end();
        return;
    }

    const creators = users.filter(u => u.role === 'CREATOR');
    const participants = users.filter(u => u.role === 'PARTICIPANT');
    const allUserIds = users.map(u => u.id);

    // 사용할 Creator (최소 1명)
    const creatorId = creators.length > 0 ? creators[0].id : users[0].id;

    // ========== 2. 프로젝트 생성 ==========
    const projects = [
        { name: '홈페이지 리뉴얼', description: '회사 홈페이지 전면 개편 프로젝트', category: '개발' },
        { name: '신제품 마케팅', description: '2026 상반기 신제품 출시 마케팅 캠페인', category: '기획' },
        { name: 'ERP 시스템 구축', description: '사내 ERP 시스템 자체 구축 프로젝트', category: '개발' },
        { name: '고객만족도 조사', description: 'Q1 고객 설문조사 및 데이터 분석', category: '기획' },
        { name: '사내 교육 프로그램', description: '신입사원 온보딩 교육 커리큘럼 개발', category: '기타' },
    ];

    const projectIds = [];
    for (const p of projects) {
        const startDate = new Date('2026-02-01');
        const endDate = new Date('2026-06-30');
        const res = await client.query(
            `INSERT INTO "Project" (id, name, description, category, "creatorId", "startDate", "endDate", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
            [p.name, p.description, p.category, creatorId, startDate, endDate]
        );
        projectIds.push(res.rows[0].id);
        console.log(`프로젝트 생성: ${p.name}`);
    }

    // 프로젝트에 참여자 연결 (_ProjectParticipants)
    for (const pId of projectIds) {
        for (const userId of allUserIds) {
            try {
                await client.query(
                    `INSERT INTO "_ProjectParticipants" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [pId, userId]
                );
            } catch (e) { /* ignore duplicates */ }
        }
    }
    console.log('프로젝트 참여자 연결 완료');

    // ========== 3. 태스크 생성 ==========
    const taskTemplates = [
        // 프로젝트 0: 홈페이지 리뉴얼
        { pIdx: 0, title: '와이어프레임 설계', desc: '전체 페이지 레이아웃 와이어프레임 설계', category: '디자인', status: 'DONE', priority: 'HIGH', planned: 3 },
        { pIdx: 0, title: 'DB 스키마 설계', desc: '필요한 테이블 및 관계도 정리', category: '개발', status: 'DONE', priority: 'HIGH', planned: 2 },
        { pIdx: 0, title: '메인 페이지 개발', desc: '히어로 섹션, 네비게이션, 푸터 구현', category: '개발', status: 'IN_PROGRESS', priority: 'HIGH', planned: 5 },
        { pIdx: 0, title: '제품 소개 페이지', desc: '제품별 상세 페이지 CMS 연동', category: '개발', status: 'TODO', priority: 'MEDIUM', planned: 3 },
        { pIdx: 0, title: 'SEO 최적화', desc: '메타태그, 사이트맵, robots.txt 설정', category: '기획', status: 'TODO', priority: 'LOW', planned: 1 },
        { pIdx: 0, title: '반응형 테스트', desc: '모바일/태블릿 반응형 QA', category: '개발', status: 'TODO', priority: 'MEDIUM', planned: 2 },

        // 프로젝트 1: 신제품 마케팅
        { pIdx: 1, title: '시장 조사 보고서', desc: '경쟁사 분석 및 시장 트렌드 리서치', category: '기획', status: 'DONE', priority: 'HIGH', planned: 4 },
        { pIdx: 1, title: '마케팅 전략 수립', desc: '타겟 고객 정의 및 채널 전략', category: '기획', status: 'IN_PROGRESS', priority: 'HIGH', planned: 3 },
        { pIdx: 1, title: 'SNS 콘텐츠 제작', desc: '인스타그램/블로그 콘텐츠 10건 제작', category: '디자인', status: 'TODO', priority: 'MEDIUM', planned: 2 },
        { pIdx: 1, title: '런칭 이벤트 기획', desc: '온라인 런칭 이벤트 시나리오 작성', category: '기획', status: 'TODO', priority: 'MEDIUM', planned: 2 },
        { pIdx: 1, title: '보도자료 배포', desc: '주요 매체 보도자료 작성 및 배포', category: '기획', status: 'TODO', priority: 'LOW', planned: 1 },

        // 프로젝트 2: ERP 시스템 구축
        { pIdx: 2, title: '요구사항 분석', desc: '각 부서별 업무 프로세스 분석 및 요구사항 취합', category: '기획', status: 'DONE', priority: 'HIGH', planned: 5 },
        { pIdx: 2, title: '시스템 아키텍처 설계', desc: 'MSA 기반 아키텍처 및 기술 스택 결정', category: '개발', status: 'DONE', priority: 'HIGH', planned: 3 },
        { pIdx: 2, title: '인사관리 모듈', desc: '사원 등록/수정/삭제 및 조직도 관리', category: '개발', status: 'IN_PROGRESS', priority: 'HIGH', planned: 8 },
        { pIdx: 2, title: '재고관리 모듈', desc: '원자재/제품 재고 입출고 관리', category: '개발', status: 'TODO', priority: 'MEDIUM', planned: 6 },
        { pIdx: 2, title: '발주/구매 모듈', desc: '거래처 관리 및 발주서 생성', category: '개발', status: 'TODO', priority: 'MEDIUM', planned: 5 },
        { pIdx: 2, title: '대시보드 개발', desc: '실시간 KPI 대시보드 구현', category: '개발', status: 'TODO', priority: 'LOW', planned: 3 },

        // 프로젝트 3: 고객만족도 조사
        { pIdx: 3, title: '설문지 설계', desc: '5점 리커트 척도 기반 설문 40문항', category: '기획', status: 'DONE', priority: 'HIGH', planned: 2 },
        { pIdx: 3, title: '온라인 설문 배포', desc: 'Google Forms 연동 자동 배포', category: '기획', status: 'DONE', priority: 'MEDIUM', planned: 1 },
        { pIdx: 3, title: '데이터 수집 및 정제', desc: '수집된 응답 데이터 클렌징', category: '기획', status: 'IN_PROGRESS', priority: 'MEDIUM', planned: 2 },
        { pIdx: 3, title: '통계 분석', desc: 'SPSS 기반 교차분석 및 회귀분석', category: '기획', status: 'TODO', priority: 'HIGH', planned: 3 },
        { pIdx: 3, title: '보고서 작성', desc: '분석 결과 기반 개선안 포함 보고서', category: '기획', status: 'TODO', priority: 'MEDIUM', planned: 2 },

        // 프로젝트 4: 사내 교육 프로그램
        { pIdx: 4, title: '교육 커리큘럼 설계', desc: '4주차 온보딩 프로그램 설계', category: '기획', status: 'DONE', priority: 'HIGH', planned: 3 },
        { pIdx: 4, title: '교육 자료 제작', desc: 'PPT 및 핸드아웃 자료 제작', category: '기타', status: 'IN_PROGRESS', priority: 'MEDIUM', planned: 4 },
        { pIdx: 4, title: '멘토링 매칭', desc: '선배-신입 멘토링 매칭 및 일정 수립', category: '기타', status: 'TODO', priority: 'MEDIUM', planned: 1 },
        { pIdx: 4, title: '교육 평가 시스템', desc: '교육 이수 후 평가지 및 피드백 시스템', category: '기타', status: 'TODO', priority: 'LOW', planned: 2 },
    ];

    const taskIds = [];
    for (let i = 0; i < taskTemplates.length; i++) {
        const t = taskTemplates[i];
        const pId = projectIds[t.pIdx];
        // 담당자 순환 배정
        const assigneeId = allUserIds[i % allUserIds.length];
        const dueDate = new Date(`2026-03-${String((i % 28) + 1).padStart(2, '0')}`);
        const endDate = new Date(dueDate); endDate.setDate(endDate.getDate() + 3 + (i % 5));
        const completedAt = t.status === 'DONE' ? new Date() : null;

        const res = await client.query(
            `INSERT INTO "Task" (id, title, description, status, priority, planned, "projectId", "assigneeId", "dueDate", "endDate", "completedAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING id`,
            [t.title, t.desc, t.status, t.priority, t.planned, pId, assigneeId, dueDate, endDate, completedAt]
        );
        const taskId = res.rows[0].id;
        taskIds.push({ id: taskId, pIdx: t.pIdx, assigneeId });

        // 복수 담당자 연결 (_TaskAssignees) - 일부 태스크에 2~3명 배정
        const assigneesToConnect = [assigneeId];
        if (i % 3 === 0 && allUserIds.length > 1) {
            assigneesToConnect.push(allUserIds[(i + 1) % allUserIds.length]);
        }
        if (i % 5 === 0 && allUserIds.length > 2) {
            assigneesToConnect.push(allUserIds[(i + 2) % allUserIds.length]);
        }
        for (const aId of [...new Set(assigneesToConnect)]) {
            try {
                await client.query(
                    `INSERT INTO "_TaskAssignees" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [taskId, aId]
                );
            } catch (e) { /* ignore */ }
        }
    }
    console.log(`태스크 ${taskIds.length}건 생성 완료`);

    // ========== 4. 하위 업무 (SubTask) ==========
    const subTaskTemplates = [
        // 태스크별 하위업무 (taskIdx 기준)
        { tIdx: 0, title: '메인 페이지 시안 작성', status: 'DONE', completed: true },
        { tIdx: 0, title: '서브 페이지 레이아웃', status: 'DONE', completed: true },
        { tIdx: 0, title: '모바일 시안 검토', status: 'DONE', completed: true },

        { tIdx: 2, title: 'Hero 섹션 구현', status: 'DONE', completed: true },
        { tIdx: 2, title: 'Navigation 바 개발', status: 'IN_PROGRESS', completed: false },
        { tIdx: 2, title: 'Footer 컴포넌트', status: 'TODO', completed: false },
        { tIdx: 2, title: '애니메이션 효과 추가', status: 'TODO', completed: false },

        { tIdx: 3, title: '제품 데이터 모델 정의', status: 'IN_PROGRESS', completed: false },
        { tIdx: 3, title: 'CMS 연동 API 개발', status: 'TODO', completed: false },
        { tIdx: 3, title: '이미지 최적화 처리', status: 'TODO', completed: false },

        { tIdx: 6, title: '경쟁사 A 분석', status: 'DONE', completed: true },
        { tIdx: 6, title: '경쟁사 B 분석', status: 'DONE', completed: true },
        { tIdx: 6, title: '시장 규모 조사', status: 'DONE', completed: true },
        { tIdx: 6, title: '트렌드 보고서 작성', status: 'DONE', completed: true },

        { tIdx: 7, title: '타겟 고객 페르소나 정의', status: 'DONE', completed: true },
        { tIdx: 7, title: 'ATL/BTL 채널 비교', status: 'IN_PROGRESS', completed: false },
        { tIdx: 7, title: '예산안 수립', status: 'TODO', completed: false },

        { tIdx: 11, title: '인터뷰 진행 (경영지원)', status: 'DONE', completed: true },
        { tIdx: 11, title: '인터뷰 진행 (R&D)', status: 'DONE', completed: true },
        { tIdx: 11, title: '인터뷰 진행 (사업부)', status: 'DONE', completed: true },
        { tIdx: 11, title: '요구사항 명세서 작성', status: 'DONE', completed: true },

        { tIdx: 13, title: 'DB 테이블 설계', status: 'IN_PROGRESS', completed: false },
        { tIdx: 13, title: 'API 엔드포인트 구현', status: 'IN_PROGRESS', completed: false },
        { tIdx: 13, title: '사원 CRUD 화면', status: 'TODO', completed: false },
        { tIdx: 13, title: '조직도 트리 뷰', status: 'TODO', completed: false },
        { tIdx: 13, title: '권한 관리 기능', status: 'TODO', completed: false },

        { tIdx: 18, title: '설문지 Google Forms 생성', status: 'DONE', completed: true },
        { tIdx: 18, title: '이메일 발송 자동화', status: 'DONE', completed: true },

        { tIdx: 19, title: '결측치 처리', status: 'IN_PROGRESS', completed: false },
        { tIdx: 19, title: '이상치 탐지', status: 'TODO', completed: false },

        { tIdx: 22, title: '1주차 회사 소개', status: 'DONE', completed: true },
        { tIdx: 22, title: '2주차 업무 프로세스', status: 'DONE', completed: true },
        { tIdx: 22, title: '3주차 OJT', status: 'IN_PROGRESS', completed: false },
        { tIdx: 22, title: '4주차 프로젝트 실습', status: 'TODO', completed: false },

        { tIdx: 23, title: 'PPT 템플릿 제작', status: 'DONE', completed: true },
        { tIdx: 23, title: '동영상 교육 자료', status: 'IN_PROGRESS', completed: false },
        { tIdx: 23, title: '퀴즈 문항 출제', status: 'TODO', completed: false },
    ];

    const subTaskIds = [];
    for (let i = 0; i < subTaskTemplates.length; i++) {
        const st = subTaskTemplates[i];
        if (st.tIdx >= taskIds.length) continue;
        const taskId = taskIds[st.tIdx].id;
        const assigneeId = allUserIds[i % allUserIds.length];
        const dueDate = new Date(2026, 2, (i % 25) + 3); // 3월 3일~27일 범위
        const endDate = new Date(dueDate); endDate.setDate(endDate.getDate() + 2);
        const completedAt = st.completed ? new Date() : null;

        const res = await client.query(
            `INSERT INTO "SubTask" (id, title, "isCompleted", status, "taskId", "assigneeId", "dueDate", "endDate", "completedAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING id`,
            [st.title, st.completed, st.status, taskId, assigneeId, dueDate, endDate, completedAt]
        );
        subTaskIds.push(res.rows[0].id);
    }
    console.log(`하위 업무 ${subTaskIds.length}건 생성 완료`);

    // ========== 5. 하위업무 코멘트 (SubTaskComment) ==========
    const commentTemplates = [
        { stIdx: 0, content: '시안 컨펌 완료했습니다. 깔끔하네요!', author: 0 },
        { stIdx: 1, content: '서브 페이지 폰트 사이즈 조정 필요', author: 1 },
        { stIdx: 3, content: 'Hero 섹션 반응형 확인 부탁드립니다', author: 0 },
        { stIdx: 3, content: '확인했습니다. iPad에서 약간 깨지는 부분 있어요', author: 1 },
        { stIdx: 4, content: '네비게이션 드롭다운 메뉴 추가해주세요', author: 0 },
        { stIdx: 4, content: '진행 중입니다. 내일 중으로 완료 예정', author: 1 },
        { stIdx: 7, content: '데이터 모델 ERD 첨부합니다', author: 0 },
        { stIdx: 10, content: '경쟁사 A 매출 데이터 업데이트했습니다', author: 0 },
        { stIdx: 14, content: '페르소나 문서 공유 드라이브에 올렸습니다', author: 0 },
        { stIdx: 15, content: 'ATL 예산이 너무 높아서 BTL 위주로 가야 할 것 같습니다', author: 1 },
        { stIdx: 17, content: '경영지원 팀장님 인터뷰 녹취록 정리 완료', author: 0 },
        { stIdx: 21, content: 'Prisma ORM으로 진행합니다', author: 0 },
        { stIdx: 21, content: '마이그레이션 스크립트도 같이 작성해주세요', author: 1 },
        { stIdx: 22, content: 'REST API 문서는 Swagger로 할까요?', author: 0 },
        { stIdx: 22, content: 'Swagger 좋습니다. OpenAPI 3.0 기준으로요', author: 1 },
        { stIdx: 28, content: '결측치 5% 이내라 삭제 처리해도 될 것 같습니다', author: 0 },
        { stIdx: 30, content: '1주차 자료는 작년 것 업데이트해서 사용', author: 0 },
        { stIdx: 34, content: 'PPT 템플릿 브랜드 가이드 반영 완료', author: 0 },
        { stIdx: 35, content: '촬영 장비 예약했습니다', author: 1 },
    ];

    let commentCount = 0;
    for (const c of commentTemplates) {
        if (c.stIdx >= subTaskIds.length) continue;
        const subTaskId = subTaskIds[c.stIdx];
        const authorId = allUserIds[c.author % allUserIds.length];
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 72) * 3600000);

        await client.query(
            `INSERT INTO "SubTaskComment" (id, content, "authorId", "subTaskId", "createdAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [c.content, authorId, subTaskId, createdAt]
        );
        commentCount++;
    }
    console.log(`코멘트 ${commentCount}건 생성 완료`);

    // ========== 6. 활동 로그 (ActivityLog) ==========
    const logActions = [
        { action: '업무 생성', entity: 'TASK' },
        { action: '업무 완료', entity: 'TASK' },
        { action: '업무 상태 변경', entity: 'TASK' },
        { action: '프로젝트 생성', entity: 'PROJECT' },
    ];

    let logCount = 0;
    for (let i = 0; i < taskIds.length; i++) {
        const t = taskIds[i];
        const log = logActions[i % logActions.length];
        const userId = t.assigneeId;
        const projectId = projectIds[t.pIdx];
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 168) * 3600000);

        await client.query(
            `INSERT INTO "ActivityLog" (id, action, "entityType", "entityId", details, "userId", "projectId", "taskId", "createdAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
            [log.action, log.entity, t.id,
            `"${taskTemplates[i].title}" 업무 관련 활동`, userId, projectId, log.entity === 'TASK' ? t.id : null, createdAt]
        );
        logCount++;
    }
    console.log(`활동 로그 ${logCount}건 생성 완료`);

    // ========== 결과 요약 ==========
    console.log('\n===== 더미 데이터 시드 완료 =====');
    console.log(`프로젝트: ${projectIds.length}건`);
    console.log(`태스크: ${taskIds.length}건`);
    console.log(`하위 업무: ${subTaskIds.length}건`);
    console.log(`코멘트: ${commentCount}건`);
    console.log(`활동 로그: ${logCount}건`);
    console.log('================================\n');

    await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

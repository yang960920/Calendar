import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  기존 더미 데이터 삭제 중...');

    // 종속 관계 순서대로 삭제 (User는 유지)
    await prisma.peerReview.deleteMany();
    await prisma.subTaskComment.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.subTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();

    console.log('✅ 기존 데이터 삭제 완료');

    // ── 부서 확인 ──
    const departments = await prisma.department.findMany();
    const deptMap: Record<string, string> = {};
    departments.forEach(d => { deptMap[d.name] = d.id; });
    console.log(`📁 부서 ${departments.length}개 확인:`, Object.keys(deptMap).join(', '));

    // ── 사용자 확인 ──
    const users = await prisma.user.findMany();
    console.log(`👥 사용자 ${users.length}명 확인:`, users.map(u => `${u.name}(${u.role})`).join(', '));

    if (users.length < 3) {
        console.error('❌ 사용자가 3명 이상 필요합니다. 먼저 사원 등록을 해주세요.');
        return;
    }

    // 역할별 사용자 분류
    const creators = users.filter(u => u.role === 'CREATOR');
    const participants = users.filter(u => u.role === 'PARTICIPANT');

    if (creators.length === 0 || participants.length < 2) {
        console.error('❌ CREATOR 1명 이상, PARTICIPANT 2명 이상 필요합니다.');
        return;
    }

    const creator = creators[0];
    const part1 = participants[0];
    const part2 = participants.length > 1 ? participants[1] : participants[0];
    const allParticipantIds = participants.slice(0, 3).map(p => p.id);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    function daysAgo(n: number) { const d = new Date(today); d.setDate(d.getDate() - n); return d; }
    function daysLater(n: number) { const d = new Date(today); d.setDate(d.getDate() + n); return d; }

    // ══════════════════════════════════════════════════════
    // 1. 프로젝트 생성
    // ══════════════════════════════════════════════════════

    console.log('\n📋 프로젝트 생성 중...');

    // 프로젝트 A: 진행 중 (긴급 업무 테스트용)
    const projA = await prisma.project.create({
        data: {
            name: '2026 신제품 런칭',
            description: '신규 방염 도료 런칭 프로젝트',
            category: '사업',
            creatorId: creator.id,
            startDate: daysAgo(30),
            endDate: daysLater(30),
            participants: { connect: allParticipantIds.map(id => ({ id })) },
        },
    });

    // 프로젝트 B: 종료됨 (피어 리뷰 테스트용 — 종료 후 3일)
    const projB = await prisma.project.create({
        data: {
            name: '1분기 품질 개선',
            description: '1분기 품질 개선 총괄 프로젝트',
            category: '품질',
            creatorId: creator.id,
            startDate: daysAgo(60),
            endDate: daysAgo(3),
            participants: { connect: allParticipantIds.map(id => ({ id })) },
        },
    });

    // 프로젝트 C: 종료 7일+ (피어 리뷰 기간 만료 테스트)
    const projC = await prisma.project.create({
        data: {
            name: '내부 문서화',
            description: '사내 문서화 프로젝트',
            category: '관리',
            creatorId: creator.id,
            startDate: daysAgo(90),
            endDate: daysAgo(10),
            participants: { connect: [part1.id, part2.id].map(id => ({ id })) },
        },
    });

    // 개인 업무 프로젝트 (월별 일지용)
    const personalProj = await prisma.project.create({
        data: {
            name: '개인 업무',
            category: '개인',
            creatorId: part1.id,
            startDate: daysAgo(30),
            endDate: daysLater(30),
        },
    });

    console.log(`  ✅ 프로젝트 4개 생성 (${projA.name}, ${projB.name}, ${projC.name}, ${personalProj.name})`);

    // ══════════════════════════════════════════════════════
    // 2. 일반 업무 (다양한 상태)
    // ══════════════════════════════════════════════════════

    console.log('\n📝 일반 업무 생성 중...');

    // 완료된 일반 업무 (공헌도 계산됨)
    await prisma.task.create({
        data: {
            title: '시장 조사 보고서 작성',
            description: '경쟁사 방염 도료 시장 분석',
            status: 'DONE',
            projectId: projA.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: daysAgo(14),
            endDate: daysAgo(7),
            completedAt: daysAgo(8),
            contributionScore: 26, // 20 * 1.3(3일 전 완료)
        },
    });

    // 복수 담당자 업무 (진행 중)
    const multiTask = await prisma.task.create({
        data: {
            title: '제품 테스트 및 인증 준비',
            description: '방염 인증 시험을 위한 샘플 준비 및 테스트',
            status: 'IN_PROGRESS',
            projectId: projA.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }, { id: part2.id }] },
            dueDate: daysAgo(5),
            endDate: daysLater(10),
        },
    });

    // SubTask가 있는 업무
    await prisma.task.create({
        data: {
            title: '마케팅 자료 제작',
            description: '카탈로그, 브로슈어 디자인',
            status: 'IN_PROGRESS',
            projectId: projA.id,
            assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: daysAgo(3),
            endDate: daysLater(5),
            subTasks: {
                create: [
                    { title: '카탈로그 디자인 초안', isCompleted: true, status: 'DONE' },
                    { title: '브로슈어 텍스트 작성', isCompleted: true, status: 'DONE' },
                    { title: '인쇄 발주', isCompleted: false, status: 'TODO' },
                    { title: '최종 검수', isCompleted: false, status: 'TODO' },
                ],
            },
        },
    });

    // 기한 지연 업무
    await prisma.task.create({
        data: {
            title: '공급업체 계약 갱신',
            description: '원자재 공급업체 2곳 연간 계약 갱신',
            status: 'IN_PROGRESS',
            projectId: projA.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: daysAgo(10),
            endDate: daysAgo(2), // 이미 지남
        },
    });

    console.log('  ✅ 일반 업무 4개 생성 (완료/진행중/서브태스크/지연)');

    // ══════════════════════════════════════════════════════
    // 3. 긴급 업무 (다양한 승인 단계)
    // ══════════════════════════════════════════════════════

    console.log('\n🚨 긴급 업무 생성 중...');

    // PENDING_CREATOR: 직원 요청 → 부서장 검수 대기
    await prisma.task.create({
        data: {
            title: '[긴급] 클레임 대응 보고서',
            description: '고객사 B 클레임 긴급 대응 보고서 작성',
            status: 'TODO',
            projectId: projA.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: today,
            endDate: daysLater(1),
            isUrgent: true,
            urgencyStatus: 'PENDING_CREATOR',
        },
    });

    // PENDING_ADMIN: 부서장 승인 → Admin 대기
    await prisma.task.create({
        data: {
            title: '[긴급] 안전 점검 서류 긴급 제출',
            description: '소방서 긴급 안전 점검 대비 서류 작성',
            status: 'TODO',
            projectId: projA.id,
            assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: today,
            endDate: daysLater(2),
            isUrgent: true,
            urgencyStatus: 'PENDING_ADMIN',
        },
    });

    // APPROVED: Admin 승인 완료 (진행 중)
    await prisma.task.create({
        data: {
            title: '[긴급] 대표이사 IR 자료 작성',
            description: '내일 오전 IR 미팅용 긴급 발표 자료',
            status: 'IN_PROGRESS',
            projectId: projA.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }, { id: part2.id }] },
            dueDate: daysAgo(1),
            endDate: daysLater(1),
            isUrgent: true,
            urgencyStatus: 'APPROVED',
        },
    });

    // APPROVED + DONE: 긴급 완료 (공헌도 ×2.0 적용)
    const urgentDone = await prisma.task.create({
        data: {
            title: '[긴급] 거래처 납품 일정 긴급 조정',
            description: '거래처 A 납품일 변경에 따른 긴급 일정 조정',
            status: 'DONE',
            projectId: projA.id,
            assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: daysAgo(3),
            endDate: daysAgo(1),
            completedAt: daysAgo(1),
            isUrgent: true,
            urgencyStatus: 'APPROVED',
            contributionScore: 40, // 20(최소보장) * 1.0 * 2.0(긴급)
        },
    });

    // 긴급 완료 업무에 첨부파일 추가 (사후 검증용)
    await prisma.attachment.create({
        data: {
            name: '납품일정_변경_확인서.pdf',
            url: 'https://example.com/dummy-attachment.pdf',
            size: 245000,
            type: 'application/pdf',
            taskId: urgentDone.id,
        },
    });

    // REJECTED: 거절된 긴급 요청
    await prisma.task.create({
        data: {
            title: '회의실 정리 긴급 요청',
            description: '3층 대회의실 정리',
            status: 'TODO',
            projectId: projA.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: daysAgo(2),
            endDate: daysAgo(1),
            isUrgent: false,
            urgencyStatus: 'REJECTED',
        },
    });

    console.log('  ✅ 긴급 업무 5개 생성 (PENDING_CREATOR/PENDING_ADMIN/APPROVED/DONE/REJECTED)');

    // ══════════════════════════════════════════════════════
    // 4. 개인 업무 (월별 일지 — 공헌도 제외 확인용)
    // ══════════════════════════════════════════════════════

    console.log('\n📓 개인 업무 생성 중...');

    await prisma.task.create({
        data: {
            title: '주간 업무 보고 작성',
            status: 'DONE',
            projectId: personalProj.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: daysAgo(1),
            endDate: today,
            completedAt: today,
            contributionScore: null, // 개인 업무는 공헌도 없음
        },
    });

    await prisma.task.create({
        data: {
            title: '이력서 업데이트',
            status: 'TODO',
            projectId: personalProj.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: today,
            endDate: daysLater(3),
            isUrgent: true,
            urgencyStatus: 'PENDING_ADMIN', // 개인 업무 긴급 요청 테스트
        },
    });

    console.log('  ✅ 개인 업무 2개 생성');

    // ══════════════════════════════════════════════════════
    // 5. 종료된 프로젝트 업무 (피어 리뷰 테스트용)
    // ══════════════════════════════════════════════════════

    console.log('\n⭐ 피어 리뷰 대상 업무 생성 중...');

    // 프로젝트 B (종료 3일 — 평가 기간 내)
    await prisma.task.create({
        data: {
            title: '품질 개선 보고서 최종본',
            status: 'DONE',
            projectId: projB.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: daysAgo(10),
            endDate: daysAgo(4),
            completedAt: daysAgo(5),
            contributionScore: 20,
        },
    });

    await prisma.task.create({
        data: {
            title: '공정 검사 체크리스트 작성',
            status: 'DONE',
            projectId: projB.id,
            assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: daysAgo(15),
            endDate: daysAgo(5),
            completedAt: daysAgo(6),
            contributionScore: 26,
        },
    });

    // 프로젝트 C (종료 10일 — 평가 기간 만료)
    await prisma.task.create({
        data: {
            title: '사내 문서 템플릿 표준화',
            status: 'DONE',
            projectId: projC.id,
            assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: daysAgo(20),
            endDate: daysAgo(11),
            completedAt: daysAgo(12),
            contributionScore: 30,
        },
    });

    console.log('  ✅ 종료 프로젝트 업무 3개 생성');

    // ══════════════════════════════════════════════════════
    // 6. 피어 리뷰 데이터 (프로젝트 C — 기간 만료 후)
    // ══════════════════════════════════════════════════════

    console.log('\n💬 피어 리뷰 데이터 생성 중...');

    // 프로젝트 C는 이미 기간 만료 → 일부 리뷰 존재
    await prisma.peerReview.create({
        data: {
            projectId: projC.id,
            reviewerId: part1.id,
            revieweeId: part2.id,
            score: 4,
        },
    });

    await prisma.peerReview.create({
        data: {
            projectId: projC.id,
            reviewerId: part2.id,
            revieweeId: part1.id,
            score: 5,
        },
    });

    // 프로젝트 B는 평가 기간 내 → 리뷰 없음 (팝업 테스트용)

    console.log('  ✅ 피어 리뷰 2건 생성 (프로젝트 C)');
    console.log('  📌 프로젝트 B는 미평가 상태 (팝업 트리거 대상)');

    // ══════════════════════════════════════════════════════
    // 7. 활동 로그
    // ══════════════════════════════════════════════════════

    console.log('\n📜 활동 로그 생성 중...');

    const logData = [
        { action: '업무 생성', entityType: 'TASK', entityId: multiTask.id, details: '"제품 테스트 및 인증 준비" 업무를 생성했습니다.', userId: creator.id, projectId: projA.id, taskId: multiTask.id },
        { action: '긴급 요청', entityType: 'TASK', entityId: urgentDone.id, details: '"거래처 납품 일정 긴급 조정" 긴급 업무를 요청했습니다.', userId: part2.id, projectId: projA.id, taskId: urgentDone.id },
        { action: '긴급 승인', entityType: 'TASK', entityId: urgentDone.id, details: '관리자가 긴급 업무를 승인했습니다. 공헌도 ×2.0 적용.', userId: creator.id, projectId: projA.id, taskId: urgentDone.id },
        { action: '업무 완료', entityType: 'TASK', entityId: urgentDone.id, details: '"거래처 납품 일정 긴급 조정" 업무를 완료 처리했습니다.', userId: part2.id, projectId: projA.id, taskId: urgentDone.id },
    ];

    for (const log of logData) {
        await prisma.activityLog.create({ data: log });
    }

    console.log(`  ✅ 활동 로그 ${logData.length}건 생성`);

    // ══════════════════════════════════════════════════════
    // 요약
    // ══════════════════════════════════════════════════════

    const taskCount = await prisma.task.count();
    const urgentCount = await prisma.task.count({ where: { isUrgent: true } });

    console.log('\n' + '='.repeat(50));
    console.log('📊 시드 데이터 요약');
    console.log('='.repeat(50));
    console.log(`  프로젝트: 4개 (진행중/종료3일/종료10일/개인)`);
    console.log(`  전체 업무: ${taskCount}개`);
    console.log(`  긴급 업무: ${urgentCount}개`);
    console.log(`  피어 리뷰: 2건 (프로젝트 C)`);
    console.log(`  활동 로그: ${logData.length}건`);
    console.log('');
    console.log('🔍 테스트 포인트:');
    console.log('  1. Admin 페이지 → 긴급 요청 탭 → PENDING_ADMIN 1건 확인');
    console.log('  2. Admin 페이지 → 완료된 긴급 업무 → 첨부파일 확인');
    console.log('  3. 프로젝트 B 접속 시 → 피어 리뷰 팝업 표시');
    console.log('  4. 프로젝트 C 접속 시 → 피어 리뷰 팝업 미표시 (기간 만료)');
    console.log('  5. 성과 분석 → 공헌도 확인 (긴급×2.0 / 개인업무 제외)');
    console.log('='.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Seed 실패:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

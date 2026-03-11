import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../node_modules/.prisma/client/index.js');
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  기존 더미 데이터 삭제 중...');

    await prisma.peerReview.deleteMany();
    await prisma.subTaskComment.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.subTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();

    console.log('✅ 기존 데이터 삭제 완료');

    const users = await prisma.user.findMany();
    console.log(`👥 사용자 ${users.length}명:`, users.map(u => `${u.name}(${u.role})`).join(', '));

    if (users.length < 3) { console.error('❌ 사용자 3명 이상 필요'); return; }

    // 첫 번째 CREATOR를 프로젝트 생성자, 나머지를 참여자로 활용
    const creator = users[0];
    const part1 = users[1];
    const part2 = users[2];
    const allPartIds = users.slice(1, 4).map(p => p.id);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return x; };

    // ══ 프로젝트 ══
    console.log('\n📋 프로젝트 생성...');

    const projA = await prisma.project.create({
        data: {
            name: '2026 신제품 런칭', description: '신규 방염 도료 런칭', category: '사업',
            creatorId: creator.id, startDate: d(-30), endDate: d(30),
            participants: { connect: allPartIds.map(id => ({ id })) }
        },
    });
    const projB = await prisma.project.create({
        data: {
            name: '1분기 품질 개선', description: '품질 개선 총괄', category: '품질',
            creatorId: creator.id, startDate: d(-60), endDate: d(-3),
            participants: { connect: allPartIds.map(id => ({ id })) }
        },
    });
    const projC = await prisma.project.create({
        data: {
            name: '내부 문서화', description: '사내 문서화', category: '관리',
            creatorId: creator.id, startDate: d(-90), endDate: d(-10),
            participants: { connect: [part1.id, part2.id].map(id => ({ id })) }
        },
    });
    const personalProj = await prisma.project.create({
        data: { name: '개인 업무', category: '개인', creatorId: part1.id, startDate: d(-30), endDate: d(30) },
    });
    console.log('  ✅ 프로젝트 4개');

    // ══ 일반 업무 ══
    console.log('\n📝 일반 업무...');
    await prisma.task.create({
        data: {
            title: '시장 조사 보고서 작성', description: '경쟁사 방염 도료 시장 분석',
            status: 'DONE', projectId: projA.id, assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: d(-14), endDate: d(-7), completedAt: d(-8), contributionScore: 26
        },
    });
    const multiTask = await prisma.task.create({
        data: {
            title: '제품 테스트 및 인증 준비', description: '방염 인증 시험 준비',
            status: 'IN_PROGRESS', projectId: projA.id, assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }, { id: part2.id }] },
            dueDate: d(-5), endDate: d(10)
        },
    });
    await prisma.task.create({
        data: {
            title: '마케팅 자료 제작', description: '카탈로그, 브로슈어',
            status: 'IN_PROGRESS', projectId: projA.id, assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: d(-3), endDate: d(5),
            subTasks: {
                create: [
                    { title: '카탈로그 디자인 초안', isCompleted: true, status: 'DONE' },
                    { title: '브로슈어 텍스트 작성', isCompleted: true, status: 'DONE' },
                    { title: '인쇄 발주', isCompleted: false, status: 'TODO' },
                    { title: '최종 검수', isCompleted: false, status: 'TODO' },
                ]
            }
        },
    });
    await prisma.task.create({
        data: {
            title: '공급업체 계약 갱신', description: '원자재 공급업체 연간 계약',
            status: 'IN_PROGRESS', projectId: projA.id, assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: d(-10), endDate: d(-2)
        },
    });
    console.log('  ✅ 일반 업무 4개');

    // ══ 긴급 업무 ══
    console.log('\n🚨 긴급 업무...');
    await prisma.task.create({
        data: {
            title: '[긴급] 클레임 대응 보고서', description: '고객사 B 클레임 대응',
            status: 'TODO', projectId: projA.id, assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: today, endDate: d(1), isUrgent: true, urgencyStatus: 'PENDING_CREATOR'
        },
    });
    await prisma.task.create({
        data: {
            title: '[긴급] 안전 점검 서류 제출', description: '소방서 긴급 안전 점검 서류',
            status: 'TODO', projectId: projA.id, assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: today, endDate: d(2), isUrgent: true, urgencyStatus: 'PENDING_ADMIN'
        },
    });
    await prisma.task.create({
        data: {
            title: '[긴급] 대표이사 IR 자료 작성', description: 'IR 미팅용 발표 자료',
            status: 'IN_PROGRESS', projectId: projA.id, assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }, { id: part2.id }] },
            dueDate: d(-1), endDate: d(1), isUrgent: true, urgencyStatus: 'APPROVED'
        },
    });
    const urgentDone = await prisma.task.create({
        data: {
            title: '[긴급] 거래처 납품 일정 조정', description: '납품일 변경 대응',
            status: 'DONE', projectId: projA.id, assigneeId: part2.id,
            assignees: { connect: [{ id: part2.id }] },
            dueDate: d(-3), endDate: d(-1), completedAt: d(-1),
            isUrgent: true, urgencyStatus: 'APPROVED', contributionScore: 40
        },
    });
    await prisma.attachment.create({
        data: {
            name: '납품일정_변경_확인서.pdf', url: 'https://example.com/dummy.pdf',
            size: 245000, type: 'application/pdf', taskId: urgentDone.id
        },
    });
    await prisma.task.create({
        data: {
            title: '회의실 정리 긴급 요청', description: '3층 대회의실 정리',
            status: 'TODO', projectId: projA.id, assigneeId: part1.id,
            assignees: { connect: [{ id: part1.id }] },
            dueDate: d(-2), endDate: d(-1), isUrgent: false, urgencyStatus: 'REJECTED'
        },
    });
    console.log('  ✅ 긴급 업무 5개');

    // ══ 개인 업무 ══
    console.log('\n📓 개인 업무...');
    await prisma.task.create({
        data: {
            title: '주간 업무 보고 작성', status: 'DONE', projectId: personalProj.id,
            assigneeId: part1.id, assignees: { connect: [{ id: part1.id }] },
            dueDate: d(-1), endDate: today, completedAt: today, contributionScore: null
        },
    });
    await prisma.task.create({
        data: {
            title: '이력서 업데이트', status: 'TODO', projectId: personalProj.id,
            assigneeId: part1.id, assignees: { connect: [{ id: part1.id }] },
            dueDate: today, endDate: d(3), isUrgent: true, urgencyStatus: 'PENDING_ADMIN'
        },
    });
    console.log('  ✅ 개인 업무 2개');

    // ══ 종료 프로젝트 업무 ══
    console.log('\n⭐ 종료 프로젝트 업무...');
    await prisma.task.create({
        data: {
            title: '품질 개선 보고서 최종본', status: 'DONE', projectId: projB.id,
            assigneeId: part1.id, assignees: { connect: [{ id: part1.id }] },
            dueDate: d(-10), endDate: d(-4), completedAt: d(-5), contributionScore: 20
        },
    });
    await prisma.task.create({
        data: {
            title: '공정 검사 체크리스트 작성', status: 'DONE', projectId: projB.id,
            assigneeId: part2.id, assignees: { connect: [{ id: part2.id }] },
            dueDate: d(-15), endDate: d(-5), completedAt: d(-6), contributionScore: 26
        },
    });
    await prisma.task.create({
        data: {
            title: '사내 문서 템플릿 표준화', status: 'DONE', projectId: projC.id,
            assigneeId: part1.id, assignees: { connect: [{ id: part1.id }] },
            dueDate: d(-20), endDate: d(-11), completedAt: d(-12), contributionScore: 30
        },
    });
    console.log('  ✅ 종료 프로젝트 업무 3개');

    // ══ 피어 리뷰 ══
    console.log('\n💬 피어 리뷰...');
    await prisma.peerReview.create({
        data: { projectId: projC.id, reviewerId: part1.id, revieweeId: part2.id, score: 4 },
    });
    await prisma.peerReview.create({
        data: { projectId: projC.id, reviewerId: part2.id, revieweeId: part1.id, score: 5 },
    });
    console.log('  ✅ 피어 리뷰 2건 (프로젝트 C)');
    console.log('  📌 프로젝트 B는 미평가 (팝업 테스트용)');

    // ══ 활동 로그 ══
    console.log('\n📜 활동 로그...');
    const logs = [
        { action: '업무 생성', entityType: 'TASK', entityId: multiTask.id, details: '"제품 테스트 및 인증 준비" 생성', userId: creator.id, projectId: projA.id, taskId: multiTask.id },
        { action: '긴급 요청', entityType: 'TASK', entityId: urgentDone.id, details: '"거래처 납품 일정 조정" 긴급 요청', userId: part2.id, projectId: projA.id, taskId: urgentDone.id },
        { action: '긴급 승인', entityType: 'TASK', entityId: urgentDone.id, details: '관리자 긴급 승인 (공헌도 ×2.0)', userId: creator.id, projectId: projA.id, taskId: urgentDone.id },
        { action: '업무 완료', entityType: 'TASK', entityId: urgentDone.id, details: '"거래처 납품 일정 조정" 완료', userId: part2.id, projectId: projA.id, taskId: urgentDone.id },
    ];
    for (const l of logs) await prisma.activityLog.create({ data: l });
    console.log(`  ✅ 활동 로그 ${logs.length}건`);

    // ══ 요약 ══
    const tc = await prisma.task.count();
    const uc = await prisma.task.count({ where: { isUrgent: true } });

    console.log('\n' + '='.repeat(50));
    console.log('📊 시드 데이터 요약');
    console.log('='.repeat(50));
    console.log(`  프로젝트: 4개  업무: ${tc}개  긴급: ${uc}개  리뷰: 2건  로그: ${logs.length}건`);
    console.log('');
    console.log('🔍 테스트 포인트:');
    console.log('  1. Admin → 긴급 요청 탭 → PENDING_ADMIN 2건');
    console.log('  2. Admin → 완료된 긴급 업무 → 첨부파일 확인');
    console.log('  3. 프로젝트 B(3일 전 종료) → 피어 리뷰 팝업');
    console.log('  4. 프로젝트 C(10일 전 종료) → 기간 만료');
    console.log('  5. 성과 분석 → 긴급×2.0 / 개인업무 제외');
    console.log('='.repeat(50));
}

main()
    .catch(e => { console.error('❌ Seed 실패:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());

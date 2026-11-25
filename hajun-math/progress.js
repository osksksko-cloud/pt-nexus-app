/* ---------------------------------------------------------------
   하준이 수학 탐험 · 공통 진도 규칙 (start.html, mission.html 이 함께 사용)
   기획: 수학/학습설계/탄탄기본_오답졸업_경시로드맵.md (v0.4)
   - 단원은 학년별 순서대로 연다. 앞 단원이 🌿(익숙)이면 다음 단원이 열린다.
   - 단원 숙달 4단계: 🌱 해 봄 → 🌿 익숙 → 🌳 능숙 → ⭐ 숙달
   - 심화(난도 3) 문제는 그 단원이 🌳 이상일 때만 미션에 나온다.
   - 경시 사다리 4층의 잠금 조건도 여기서 계산한다.
---------------------------------------------------------------- */
(function () {
  const RULES = {
    familiar: { minFirst: 4, rate: 0.8 },   // 🌿: 기본(난도1) 첫 시도 4개 이상, 80% 이상
    proficient: { minFirst: 4, rate: 0.7 }, // 🌳: 응용·심화(난도2~3) 첫 시도 4개 이상, 70% 이상
    masteredDays: 3,                        // ⭐: 🌳 + 서로 다른 3일 이상 도움 없이 정답
    contestRate: 0.6,                       // 3층: 최근 2개 단원 심화 첫 시도 60% 이상
    contestMinTries: 2,
    window: 8,                              // 단계 판정에 쓰는 '최근 첫 시도' 개수
  };
  const STAGES = [
    { key: 0, icon: '·', name: '시작 전' },
    { key: 1, icon: '🌱', name: '해 봄' },
    { key: 2, icon: '🌿', name: '익숙' },
    { key: 3, icon: '🌳', name: '능숙' },
    { key: 4, icon: '⭐', name: '숙달' },
  ];

  function index(D) {
    if (D._idx) return D._idx;
    const byId = {}; D.questions.forEach(q => { byId[q.id] = q; });
    const order = {}; [4, 5, 6].forEach(g => { order[g] = D.units.filter(u => u.g === g).map(u => u.id); });
    return (D._idx = { byId, order, unitById: Object.fromEntries(D.units.map(u => [u.id, u])) });
  }

  // 한 단원의 숙달 단계와 근거 수치
  function unitStage(S, D, uid) {
    const { byId } = index(D);
    const att = (S.attempts || []).filter(a => a.u === uid && byId[a.qid]);
    const firstOf = mode => {         // 미션에서 처음 푼 시도만 (오답 확인·복습 제외)
      const seen = new Set(), out = [];
      att.forEach(a => { if ((a.mode === 'basic' || a.mode === 'app') && !seen.has(a.qid)) { seen.add(a.qid); out.push(a); } });
      return mode === 1 ? out.filter(a => byId[a.qid].d === 1) : out.filter(a => byId[a.qid].d >= 2);
    };
    // 최근 기록으로만 판단 (처음에 많이 틀렸어도 나중에 잘하면 올라가도록): 기본·응용 각각 최근 8개 첫 시도
    const bAll = firstOf(1), apAll = firstOf(2), b = bAll.slice(-RULES.window), ap = apAll.slice(-RULES.window), adv = ap.filter(a => byId[a.qid].d === 3);
    const ok = list => list.filter(a => a.ok && !a.hint && a.conf !== 'maybe').length;   // 힌트 보고 맞힌 것·'아마도'로 맞힌 것은 실력으로 치지 않음
    const rate = list => list.length ? ok(list) / list.length : 0;
    const okDays = new Set(att.filter(a => a.ok && !a.hint && a.conf !== 'maybe').map(a => a.date)).size;
    let stage = att.length ? 1 : 0;
    if (stage && b.length >= RULES.familiar.minFirst && rate(b) >= RULES.familiar.rate) stage = 2;
    if (stage === 2 && ap.length >= RULES.proficient.minFirst && rate(ap) >= RULES.proficient.rate) stage = 3;
    if (stage === 3 && okDays >= RULES.masteredDays) stage = 4;
    const next = stage === 0 ? '이 단원 문제를 처음 풀어 봐요'
      : stage === 1 ? `기본 문제 첫 시도 ${b.length}/${RULES.familiar.minFirst}개 · 정답률 ${Math.round(rate(b) * 100)}% (80% 필요)`
      : stage === 2 ? `응용 문제 첫 시도 ${ap.length}/${RULES.proficient.minFirst}개 · 정답률 ${Math.round(rate(ap) * 100)}% (70% 필요)`
      : stage === 3 ? `혼자 맞힌 날 ${okDays}/${RULES.masteredDays}일`
      : '숙달! 가끔 복습에서 다시 만나요';
    return { stage, ...STAGES[stage], basic: { n: b.length, rate: rate(b) }, app: { n: ap.length, rate: rate(ap) },
      adv: { n: adv.length, rate: rate(adv) }, okDays, next };
  }

  // 단원이 열려 있는가: 학년 첫 단원 / 앞 단원 🌿 이상 / 부모님이 직접 연 단원
  function unitOpen(S, D, uid) {
    const { order, unitById } = index(D);
    const u = unitById[uid]; if (!u) return false;
    if (S.settings && S.settings.openAll) return true;
    if (S.settings && S.settings.opened && S.settings.opened[uid]) return true;
    const list = order[u.g], i = list.indexOf(uid);
    if (i <= 0) return true;
    return unitStage(S, D, list[i - 1]).stage >= 2 || unitDone(S, D, list[i - 1]) || unitStage(S, D, uid).stage >= 1;   // 앞 단원 테스트 통과도 열림
  }

  // 순서상 지금 공부할 단원: 열린 단원 중 아직 🌳가 아닌 첫 단원
  function recommendedUnit(S, D, grade) {
    const { order } = index(D);
    const list = order[grade];
    return list.find(uid => unitOpen(S, D, uid) && !unitDone(S, D, uid)) || [...list].reverse().find(uid => unitOpen(S, D, uid)) || list[0];   // 다 끝났으면 열린 마지막 단원 (잠긴 단원으로 건너뛰지 않음)
  }

  // 경시 사다리 4층
  function ladder(S, D, grade) {
    const { order } = index(D);
    const st = order[grade].map(uid => ({ uid, ...unitStage(S, D, uid) }));
    const anyProf = st.filter(x => x.stage >= 3);
    const recentAdv = st.filter(x => x.adv.n > 0).slice(-2);
    const advOk = recentAdv.length >= 2 && recentAdv.every(x => x.adv.n >= RULES.contestMinTries && x.adv.rate >= RULES.contestRate);
    const sem = s => st.filter(x => x.uid.split('-')[1] === String(s));
    const flu = fluency(S, grade);
    const semHalf = [1, 2].some(s => sem(s).filter(x => x.stage >= 3).length >= Math.ceil(sem(s).length / 2));
    return [
      { floor: 1, name: '기본·응용', desc: '매일 미션 · 교과서와 기본응용 수준', open: true, conds: [{ ok: true, text: '처음부터 열려 있어요' }] },
      { floor: 2, name: '심화', desc: '최상위 수준 문제가 미션 응용 자리에 나와요', open: anyProf.length > 0,
        conds: [{ ok: anyProf.length > 0, text: `단원 하나를 🌳 능숙으로 (지금 ${anyProf.length}개 단원)` }] },
      { floor: 3, name: '경시 전략', desc: '주 1~2회 · 전략 1개씩 · 15분 혼자 고민', open: false, // 콘텐츠 준비 후 advOk && flu.ok 로 연다
        conds: [{ ok: advOk, text: '최근 두 단원 심화 문제 첫 시도 60% 이상' },
                { ok: flu.ok, text: `⚡ 연산 훈련: 학년 연산 기술 모두 익힘 ✅ — 실수 0을 서로 다른 2일 (지금 ${flu.passed}/${flu.total})` }] },
      { floor: 4, name: '경시 실전', desc: '학기 말 KMA 기출 1회분 실전', open: false,
        conds: [{ ok: semHalf, text: '한 학기 단원의 절반 이상 🌳' },
                { ok: false, text: '경시 전략 6개 경험 (3층이 열리면 시작)' }] },
    ];
  }

  // 오답 상자 현황 (현재 구현된 칸: 당일 확인 · 토요일 원래 문제)
  function wrongBox(S) {
    const w = S.wrong || [];
    return {
      total: w.length,
      todayCheck: w.filter(x => x.repair !== 'success').length,
      saturday: w.filter(x => x.repair === 'success' && x.sat !== 'done').length,
      graduated: w.filter(x => x.sat === 'done').length,
    };
  }


  /* ---------- ⚡ 연산 훈련 (drill.html) ----------
     - 제한 시간·목표 시간 없음 (2026-11-12 부모님 결정). 시계는 '내 기록'을 재기만 한다.
     - 별은 정확도로만: ⭐⭐⭐ 실수 0 / ⭐⭐ 실수 1 / ⭐ 고쳐서 완성
     - 기록(최고 기록·신기록)은 실수 0인 세트만 인정 → "정확해야 빨라진 것"
     - 익힘 ✅: 실수 0 세트를 서로 다른 2일 해내면 그 기술 익힘 (연산 유창성 = 학년 기술 모두 익힘) */
  const DRILL = {
    passDays: 2,               // 익힘에 필요한 '실수 0' 날 수
    skills: [
      { id: 'mul-table',  g: 0, name: '곱셈구구',            ex: '7 × 8',          n: 20 },
      { id: 'div-table',  g: 0, name: '나눗셈구구',          ex: '56 ÷ 8',         n: 20 },
      { id: 'g4-addsub',  g: 4, u: '4-1-1', name: '큰 수 덧셈·뺄셈',     ex: '4,528 + 3,967',  n: 10 },
      { id: 'g4-round',   g: 4, u: '4-1-3', name: '몇십·몇백 곱셈',      ex: '300 × 40',       n: 10 },
      { id: 'g4-mul',     g: 4, u: '4-1-3', name: '세 자리 × 두 자리',    ex: '347 × 26',       n: 6 },
      { id: 'g4-div',     g: 4, u: '4-1-3', name: '세 자리 ÷ 두 자리',    ex: '858 ÷ 26',       n: 6 },
      { id: 'g5-mixed',   g: 5, u: '5-1-1', name: '혼합 계산',           ex: '30 + 4 × 6 − 8', n: 8 },
      { id: 'g5-gcd',     g: 5, u: '5-1-2', name: '최대공약수·최소공배수', ex: '12와 18',        n: 8 },
      { id: 'g5-fracadd', g: 5, u: '5-1-5', name: '분수 덧셈·뺄셈',       ex: '2/3 + 1/4',      n: 8 },
      { id: 'g5-fracmul', g: 5, u: '5-2-2', name: '분수 곱셈',           ex: '3/4 × 2/9',      n: 8 },
      { id: 'g5-decmul',  g: 5, u: '5-2-4', name: '소수 곱셈',           ex: '2.4 × 0.3',      n: 8 },
      { id: 'g6-fracdiv', g: 6, u: '6-1-1', name: '분수 나눗셈',          ex: '3/4 ÷ 2/5',      n: 8 },
      { id: 'g6-decdiv',  g: 6, u: '6-1-3', name: '소수 나눗셈',          ex: '7.56 ÷ 1.2',     n: 8 },
      { id: 'g6-percent', g: 6, u: '6-1-4', name: '백분율',              ex: '80의 25%',       n: 8 },
      { id: 'g6-ratio',   g: 6, u: '6-2-4', name: '비례식',              ex: '3 : 5 = 12 : □', n: 8 },
    ],
  };
  function drillSkills(grade) { return DRILL.skills.filter(k => k.g === 0 || k.g === grade); }
  // 기술 하나의 기록: 정확도·속도 변화 (제한 시간 없음)
  function drillLevel(S, skillId) {
    const log = ((S.drill && S.drill.log) || []).filter(r => r.skill === skillId);
    const clean = log.filter(r => r.wrong === 0);
    const cleanDays = new Set(clean.map(r => r.date)).size;
    const done = cleanDays >= DRILL.passDays;
    const best = clean.length ? Math.min(...clean.map(r => r.sec)) : null;
    return { done, level: done ? 2 : 1, cleanDays, passDays: Math.min(cleanDays, DRILL.passDays), best,
      firstClean: clean.length ? clean[0].sec : null, tries: log.length, last: log[log.length - 1] || null, log };
  }
  // 학년 연산 유창성: 그 학년 연산 기술(기초 포함)을 모두 익힘
  function fluency(S, grade) {
    const list = drillSkills(grade);
    const passed = list.filter(k => drillLevel(S, k.id).done).length;
    return { ok: passed === list.length, passed, total: list.length };
  }

  /* ---------- 실력 게이지 0~100 (daily.html) ----------
     단원 문제를 처음 푼 기록 최근 12개로 계산. 난도가 높을수록 비중 큼(1 : 1.3 : 1.6).
     확실하게 맞힘 1점, '아마도'로 맞힘 0.6점, 힌트·틀림 0점. 문제 수가 8개가 될 때까지는 조금 낮게(덜 확인됨).
     before: 이 날짜 이전 기록만으로 계산 → 오늘 얼마나 올랐는지 비교용 */
  function unitScore(S, D, uid, before) {
    const { byId } = index(D), seen = new Set(), first = [];
    (S.attempts || []).forEach(a => {
      if (a.u !== uid || !byId[a.qid] || !(a.mode === 'basic' || a.mode === 'app') || seen.has(a.qid)) return;
      if (before && a.date >= before) return;
      seen.add(a.qid); first.push(a);
    });
    const last = first.slice(-12); if (!last.length) return 0;
    const W = { 1: 1, 2: 1.3, 3: 1.6 };
    let sw = 0, sv = 0;
    last.forEach(a => { const w = W[byId[a.qid].d] || 1; sw += w; sv += w * (a.ok && !a.hint ? (a.conf === 'maybe' ? 0.6 : 1) : 0); });
    const cov = Math.min(1, last.length / 8);
    return Math.round(100 * (sv / sw) * (0.35 + 0.65 * cov));
  }

  /* ---------- 🗺️ 오늘의 학습 코스 (매일 같은 순서로 클릭해서 완성) ----------
     ① ⚡ 연산 기록 깨기 → ② 🏃 매일 학습 1판 → ③ 📚 오늘의 미션(개념·기본·응용·오답 확인·돌아보기)
     → (토요일·복습할 오답이 있으면) ④ 🗓️ 토요일 복습. 오늘 단원은 매일 학습과 미션이 같은 단원. */
  function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dailyGrade(S) { return (S.settings && S.settings.daily && S.settings.daily.grade) || 5; }
  /* ---------- 하루 공부양(2배) · 내일 수업 미리 하기 (2026-11-24) ----------
     dose: 한 수업에서 연산·레이스는 dose판, 미션 문제도 유형마다 dose개 (기본 2배, 부모님이 1배로 바꿀 수 있음)
     lessonNo: 오늘 몇 번째 수업인지. 오늘 코스를 다 마치면 '내일 수업 미리 하기'로 다음 수업(최대 MAX_LESSONS)을 이어서 함 */
  const MAX_LESSONS = 3;
  function dose(S) { return (S.settings && S.settings.dose) === 1 ? 1 : 2; }
  function lessonNo(S) { const L = S.lessons; return L && L.date === ymd() && L.n > 1 ? L.n : 1; }
  function missionsToday(S) { const d = (S.days || {})[ymd()] || {};
    return d.missions || (d.status === 'success' || d.status === 'learning_done_check_pending' ? 1 : 0); }
  // 미션 문제 수: 많이(기본) = 기본 10·응용 5 (2026-11-24 요청), 적게 = 기본 2·응용 2 (예전 양)
  function missionCounts(S) { return dose(S) === 2 ? { basic: 10, app: 5, min: 35 } : { basic: 2, app: 2, min: 15 }; }
  function xpCap(S) { return 50 * lessonNo(S); }
  function xpKey(S, key) { const n = lessonNo(S); return n > 1 ? key + '#' + n : key; }
  // 하루가 바뀐 것처럼 단원을 새로 정함: 고른 단원이 아직 🌳 전이면 그대로, 🌳가 되었으면 순서상 다음 단원
  function freshUnit(S, D) {
    const g = dailyGrade(S), units = Object.fromEntries(D.units.map(x => [x.id, x])), u = S.daily && S.daily.unit;
    const rem = remedialUnit(S, D); if (rem) return rem;
    if (u && units[u] && units[u].g === g && unitOpen(S, D, u) && !unitDone(S, D, u)) return u;
    return recommendedUnit(S, D, g);
  }
  function canNextLesson(S, D) { return !course(S, D).next && lessonNo(S) < MAX_LESSONS; }
  function startNextLesson(S, D) {
    if (!canNextLesson(S, D)) return false;
    const unit = freshUnit(S, D);
    S.lessons = { date: ymd(), n: lessonNo(S) + 1, unit };
    if (!(S.active && S.active.date === ymd())) S.unitId = unit;
    return true;
  }
  function dailyUnit(S, D) {
    const g = dailyGrade(S), t = ymd(), units = Object.fromEntries(D.units.map(x => [x.id, x]));
    const okU = u => !!(u && units[u] && units[u].g === g);
    // 0) '내일 수업 미리 하기' 중이면 그 수업을 시작할 때 정한 단원
    if (lessonNo(S) > 1 && okU(S.lessons.unit)) return S.lessons.unit;
    // 1) 오늘 이미 시작한 단원이 있으면 그 단원으로 하루 고정 (하루 중간에 🌳가 되어도 단원이 바뀌지 않게)
    const log = ((S.daily && S.daily.log) || []).filter(r => r.date === t);
    const cur = S.daily && S.daily.cur && S.daily.cur.date === t ? S.daily.cur.unit : null;
    const pinned = cur || (log.length && log[0].unit) || ((S.days || {})[t] || {}).unitId;
    if (okU(pinned)) return pinned;
    // 1.5) 🎯 테스트를 통과 못 한 단원이 있으면 그 단원 보충이 먼저
    const rem = remedialUnit(S, D); if (rem) return rem;
    // 2) 부모님·아이가 고른 단원: 아직 🌳가 아닐 때만 (🌳가 되면 다음 단원으로 자동 진행)
    const u = S.daily && S.daily.unit;
    if (okU(u) && unitOpen(S, D, u) && !unitDone(S, D, u)) return u;
    // 3) 순서상 다음 단원
    return recommendedUnit(S, D, g);
  }
  // 연산 훈련도 교과서 순서대로: 지금 단원(오늘의 단원)까지 배운 연산만 열림. 앞 학년은 모두 열림, 뒤 학년은 기초만.
  function drillLimit(S, D, grade) { const g = dailyGrade(S); return grade < g ? '9' : grade > g ? '' : dailyUnit(S, D); }
  function drillOpen(S, D, grade, k) { return !k.u || k.u <= drillLimit(S, D, grade); }
  // 추천: 순서상 아직 익히지 못한 첫 기술 (오늘 했다고 다음 기술로 건너뛰지 않음 → 익힐 때까지 같은 기술)
  function drillRecommend(S, D, grade) {
    const list = drillSkills(grade).filter(k => drillOpen(S, D, grade, k));
    return list.find(k => !drillLevel(S, k.id).done) || list[list.length - 1] || null;
  }
  /* ---------- 🏁 단원 마무리 테스트 (2026-11-25): 단원이 🌳 능숙이 되면 기본5·응용5·심화5를 힌트 없이 ---------- */
  const TEST = { per: { 1: 5, 2: 5, 3: 5 }, min: 20 };
  function unitTests(S, uid) { return ((S.tests || {})[uid]) || []; }
  function testToday(S) { const t = ymd(); for (const [uid, list] of Object.entries(S.tests || {})) { const r = list.find(x => x.date === t); if (r) return Object.assign({ uid }, r); } return null; }
  // 테스트 차례인 단원: 지금 학년에서 🌳 이상인데 아직 테스트를 안 본 첫 단원 (하루 1번까지)
  function testDue(S, D) {
    if (S.utest && !(S.utest.sh && S.utest.sh.graded) && (S.utest.date === ymd() || !testToday(S))) return S.utest.uid;   // 푸는 중인 시험 (자정을 넘겨도 이어서)
    if (testToday(S)) return null;
    const { order } = index(D);
    return (order[dailyGrade(S)] || []).find(uid => {
      const last = lastTest(S, uid);
      if (!last) return unitStage(S, D, uid).stage >= 3;                               // 🌳가 되었는데 아직 테스트 안 봄
      return testRank(last) < 3 && practiceDaysSince(S, uid, last.date) >= RETEST_DAYS;  // 통과 못 했으면 2일 더 연습한 뒤 재시험 (연습 중 진도가 내려가도 막히지 않게 🌳 조건 없음)
    }) || null;
  }
  /* ---------- 🎯 레벨 맞춤 (2026-11-25): 테스트 결과가 다음 공부를 바꾼다 ----------
     rank 1 📘 기본 다시 / 2 🌿 응용 더 → 같은 단원에 머물며 그 난이도 위주로 RETEST_DAYS일 → 재시험
     rank 3 🌳 → 통과(보통 속도) · rank 4~5 🔥🏆 → 통과 + 다음 단원부터 심화를 🌿 단계에서 일찍 섞음 */
  const RETEST_DAYS = 2;
  function lastTest(S, uid) { const l = unitTests(S, uid); return l[l.length - 1] || null; }
  function testRank(r) { return { '📘': 1, '🌿': 2, '🌳': 3, '🔥': 4, '🏆': 5 }[testVerdict(r).icon]; }
  function practiceDaysSince(S, uid, date) { return new Set((S.attempts || []).filter(a => a.u === uid && a.date > date && a.mode !== 'test').map(a => a.date)).size; }
  // 단원 끝 = 🌳 능숙 + 마무리 테스트 통과(🌳 이상). 테스트 전이거나 통과 못 하면 그 단원을 계속 공부
  function unitDone(S, D, uid) { const t = lastTest(S, uid); return !!t && testRank(t) >= 3; }   // 첫 테스트는 🌳가 되어야 열리므로, 통과 기록 = 단원 끝
  // 테스트를 통과 못 한 단원 (지금 학년, 순서상 첫 단원): 다른 단원을 골라 두었어도 이 단원부터 보충
  function remedialUnit(S, D) { return (index(D).order[dailyGrade(S)] || []).find(uid => { const t = lastTest(S, uid); return t && testRank(t) < 3; }) || null; }
  // 최근 테스트 2번(1번뿐이면 그 1번)이 모두 🔥 이상이면 '심화 빠른 길'
  function fastTrack(S) { const all = Object.values(S.tests || {}).flat().sort((a, b) => (a.at || '').localeCompare(b.at || '')).slice(-2);
    return all.length > 0 && all.every(r => testRank(r) >= 4); }
  // 이 단원에서 문제 난이도 고르기: pattern = 레이스 단원 문제 난이도 순서, adv = 미션 응용 자리에 심화
  function focus(S, D, uid) {
    const st = unitStage(S, D, uid).stage, t = lastTest(S, uid), rk = t ? testRank(t) : 0;
    if (t && rk === 1) return { mode: 'basic', pattern: [1, 1, 2, 1], adv: false, note: '📘 테스트 결과에 맞춰 기본 다지기 중 · 2일 뒤 재시험' };
    if (t && rk === 2) return { mode: 'app', pattern: [2, 1, 2, 2], adv: false, note: '🌿 테스트 결과에 맞춰 응용 연습 중 · 2일 뒤 재시험' };
    if (st >= 3) return { mode: 'adv', pattern: [2, 3, 2, 3], adv: true, note: '' };
    if (st >= 2 && fastTrack(S)) return { mode: 'adv', pattern: [1, 2, 3, 2], adv: true, note: '🚀 지난 테스트가 심화 수준이라 심화 문제를 일찍 섞어요' };
    if (st >= 2) return { mode: 'app', pattern: [1, 2, 2, 2], adv: false, note: '' };
    return { mode: 'basic', pattern: [1, 1, 2, 1], adv: false, note: '' };
  }
  // 테스트 뒤 다음 공부 안내 (결과 화면·알림)
  function testNext(S, D, uid, r) { const rk = testRank(r), U = index(D).unitById, o = index(D).order[U[uid].g] || [], nx = U[o[o.indexOf(uid) + 1]];
    if (rk <= 2) return `같은 단원을 ${rk === 1 ? '기본' : '응용'} 문제 위주로 ${RETEST_DAYS}일 더 공부한 뒤 다시 테스트해요`;
    if (rk >= 4 && fastTrack(S)) return `통과! ${nx ? '다음 단원 ' + nx.g + '-' + nx.s + ' ' + nx.title + '으로 가요. ' : ''}실력이 좋아서 심화 문제를 일찍 섞어요 🚀`;
    return `통과! ${nx ? '다음 단원 ' + nx.g + '-' + nx.s + ' ' + nx.title + '으로 가요' : '이 학년 마지막 단원이에요'}`; }
  // 점수 → 수준 (각 5문제 기준). 문제은행 안에서의 상대 위치일 뿐, 전국 백분위가 아님
  function testVerdict(r) {
    const b = r.b[1] ? r.b[0] / r.b[1] : 1, a = r.a[1] ? r.a[0] / r.a[1] : 1, v = r.v[1] ? r.v[0] / r.v[1] : 0;   // 문제은행에 없는 난이도는 판정에서 빼기 (심화는 없으면 인정 안 함)
    if (b < 0.8) return { icon: '📘', name: '기본 다시 다지기', tip: '기본 개념에서 실수가 있어요. 레이스·미션의 기본 문제를 조금 더 풀고 넘어가요.' };
    if (a < 0.6) return { icon: '🌿', name: '기본 탄탄 · 응용 연습 더', tip: '기본은 잘 알아요. 문장이 긴 응용 문제를 천천히 읽는 연습이 필요해요.' };
    if (v < 0.6) return { icon: '🌳', name: '교과서 수준 완성', tip: '기본·응용은 탄탄해요. 심화는 여러 단계를 이어 생각하는 연습을 하면 올라가요.' };
    if (v < 0.8 || b + a < 1.8) return { icon: '🔥', name: '심화 도전 수준', tip: '심화 문제도 절반 넘게 혼자 풀었어요. 틀린 심화 유형만 다시 보면 돼요.' };
    return { icon: '🏆', name: '심화까지 탄탄', tip: '심화 문제까지 혼자 풀었어요. 이 단원은 확실히 내 것이에요!' };
  }
  function course(S, D) {
    const t = ymd(), sat = new Date().getDay() === 6, k = lessonNo(S), n = dose(S);
    const rec = drillRecommend(S, D, dailyGrade(S)), dToday = ((S.drill && S.drill.log) || []).filter(r => r.date === t);
    const rToday = ((S.daily && S.daily.log) || []).filter(r => r.date === t);
    const inLesson = cnt => Math.max(0, Math.min(n, cnt - n * (k - 1)));    // 이번 수업에서 한 판 수
    const dN = inLesson(dToday.length), rN = inLesson(rToday.length), prog = x => n > 1 ? ` · ${x}/${n}판` : '';
    const due = testDue(S, D), tt = testToday(S), U = index(D).unitById, fnote = focus(S, D, dailyUnit(S, D)).note;
    const steps = [];
    if (due || (tt && (tt.k || 1) === k)) { const u = U[due || tt.uid];   // 테스트는 본 수업의 코스에만 보임
      steps.push({ key: 'test', icon: '🏁', name: '단원 마무리 테스트', min: TEST.min,
        desc: `${u ? u.g + '-' + u.s + ' ' + u.title + ' · ' : ''}기본 5 · 응용 5 · 심화 5 · 힌트 없이 내 실력 확인`,
        href: 'mission.html#test', done: !!tt }); }
    steps.push(
      { key: 'drill', icon: '⚡', name: `연산 기록 깨기${n > 1 ? ' ' + n + '판' : ''}`, min: 5 * n,
        desc: (rec ? rec.name + ' · 시간 제한 없이 내 기록 깨기' : '') + prog(dN),
        href: 'drill.html' + (rec ? '#' + rec.id : ''), done: dN >= n },
      { key: 'daily', icon: '🏃', name: `매일 학습 레이스 ${n}판`, min: 7 * n, desc: (fnote || '한 판 6문제 · 끝나면 실력 게이지 확인') + prog(rN),
        href: 'daily.html#start', done: rN >= n },
      { key: 'mission', icon: '📚', name: k > 1 ? `${k}번째 수업 미션` : '오늘의 미션', min: missionCounts(S).min,
        desc: `개념 → 기본 ${missionCounts(S).basic}문제 → 응용 ${missionCounts(S).app}문제 → 오답 확인 → 돌아보기`,
        href: 'mission.html#course', done: missionsToday(S) >= k });
    const satWait = (S.wrong || []).filter(w => w.sat !== 'done').length;
    if (k === 1 && sat && (satWait || (S.xpAwards || {})[t + '|saturday_review']))
      steps.push({ key: 'review', icon: '🗓️', name: '토요일 복습', min: 10, desc: `처음 틀렸던 문제 ${satWait}개를 해설 없이 다시`,
        href: 'mission.html#review', done: !!(S.xpAwards || {})[t + '|saturday_review'] });
    steps.forEach((s, i) => { s.no = i + 1; });
    const next = steps.find(s => !s.done) || null;
    return { steps, next, done: steps.filter(s => s.done).length, total: steps.length, min: steps.reduce((a, s) => a + s.min, 0), lesson: k, dose: n };
  }
  /* ---------- 💬 오늘의 피드백: 오늘 기록으로 칭찬할 점·더 잘할 점을 바로 알려 줌 (기기 안에서 규칙으로 계산) ---------- */
  function todayReport(S, D) {
    const t = ymd(), mm = x => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
    const ix = D ? index(D) : null, praise = [], improve = [];
    const att = (S.attempts || []).filter(a => a.date === t);
    const first = att.filter(a => a.mode === 'basic' || a.mode === 'app');
    const fixes = att.filter(a => a.mode === 'repair');
    const dlog = ((S.daily && S.daily.log) || []).filter(r => r.date === t);
    const all = (S.drill && S.drill.log) || [], drill = all.filter(r => r.date === t);
    const day = (S.days || {})[t] || {};
    const skName = id => (DRILL.skills.find(k => k.id === id) || {}).name || id;
    // ⚡ 연산
    const bySkill = {}; drill.forEach(r => (bySkill[r.skill] ||= []).push(r));
    Object.entries(bySkill).forEach(([id, L]) => {
      const before = all.filter(r => r.skill === id && r.date < t && !r.wrong), prevBest = before.length ? Math.min(...before.map(r => r.sec)) : null;
      const clean = L.filter(r => !r.wrong), best = clean.length ? Math.min(...clean.map(r => r.sec)) : null;
      if (best != null && prevBest != null && best < prevBest) praise.push(`🏅 ${skName(id)} 신기록! ${mm(prevBest)} → ${mm(best)} (${prevBest - best}초 빨라짐)`);
      else if (best != null && prevBest == null) praise.push(`⚡ ${skName(id)} 첫 실수 0 기록 ${mm(best)}`);
      else if (clean.length) praise.push(`⚡ ${skName(id)} 실수 0으로 정확하게 풀었어요`);
      const miss = L.flatMap(r => r.miss || []);
      if (miss.length) { const red = miss.filter(m => m.why === '약분 안 함').length;
        improve.push(red ? `✂️ ${skName(id)}: 약분을 안 해서 틀린 문제 ${red}개 → 답을 쓰기 전에 "더 나눌 수 있나?" 확인`
                         : `⚡ ${skName(id)}: 실수 ${miss.length}개 (예: ${miss[0].q} → ${miss[0].c}) → 다 풀고 거꾸로 검산해 보기`); }
    });
    // 🏃 매일 학습 · 📚 미션
    if (dlog.length) {
      const top = Math.max(...dlog.map(r => r.stars));
      if (top === 3) praise.push('🏃 레이스 한 판을 모두 정답으로 완주했어요 ⭐⭐⭐');
      const g0 = dlog[0].startScore, g1 = dlog[dlog.length - 1].score, u = ix && ix.unitById[dlog[0].unit];
      if (g1 > g0) praise.push(`📈 ${u ? u.title + ' ' : ''}실력 게이지 ${g0} → ${g1} (▲${g1 - g0})`);
      const best = Math.max(...dlog.map(r => r.combo || 0)); if (best >= 4) praise.push(`🔥 ${best}문제 연속 정답`);
    }
    if (first.length) {
      const ok = first.filter(a => a.ok).length, r = ok / first.length;
      if (r >= 0.8) praise.push(`🎯 처음 푼 문제 ${first.length}개 중 ${ok}개 정답 (${Math.round(r * 100)}%)`);
      else improve.push(`🎯 처음 푼 문제 정답 ${ok}/${first.length} — 틀린 문제의 풀이를 한 번 더 읽어 봐요`);
    }
    const tt = testToday(S);
    if (tt) { const v = testVerdict(tt), rk = testRank(tt);
      (rk >= 3 ? praise : improve).unshift(`🏁 단원 마무리 테스트 ${tt.ok}/${tt.n} · ${v.icon} ${v.name}${rk >= 3 ? '' : ' → ' + v.tip}`); }
    const fixedOk = fixes.filter(a => a.ok).length;
    if (fixedOk) praise.push(`🔧 틀렸던 유형 ${fixedOk}개를 숫자 바뀐 새 문제로 스스로 고쳤어요`);
    if (day.status === 'success') praise.push('📚 오늘의 미션 성공 — 오답 확인까지 혼자 해냈어요');
    if (day.note) praise.push(`🪞 돌아보기: “${day.note}”`);
    const sureWrong = first.filter(a => !a.ok && a.conf === 'sure' && a.ans).length;
    if (sureWrong) improve.push(`😮 ‘확실해요’ 했는데 틀린 문제 ${sureWrong}개 → 제출 전에 문제를 한 번 더 읽고 답을 확인해요`);
    const maybeOk = first.filter(a => a.ok && a.conf === 'maybe').length;
    if (maybeOk) improve.push(`🤔 ‘아마도’로 맞힌 문제 ${maybeOk}개 → 풀이를 다시 보면 다음엔 ‘확실해요’가 될 거예요`);
    const blank = first.filter(a => !a.ans).length;
    if (blank) improve.push(`⬜ 빈칸으로 낸 문제 ${blank}개 → 모르면 아는 데까지라도 써 봐요`);
    const cc = {}; att.forEach(a => { if (a.cause) cc[a.cause] = (cc[a.cause] || 0) + 1; });
    const topCause = Object.entries(cc).sort((a, b) => b[1] - a[1])[0];
    if (topCause) improve.push({ calc: `😵 계산 실수로 틀린 게 ${topCause[1]}개 → 한 줄씩 천천히, 끝나면 검산`, read: `📖 문제를 잘못 읽은 게 ${topCause[1]}개 → 묻는 것에 밑줄 긋고 단위 확인`, dontknow: `🤔 몰라서 틀린 게 ${topCause[1]}개 → 개념 카드와 풀이를 다시 보고, 내일 그 유형을 또 만나요` }[topCause[0]]);
    if (ix) {   // 오늘 많이 틀린 유형
      const wk = {}; first.filter(a => !a.ok).forEach(a => { const q = ix.byId[a.qid]; if (q && q.skill) wk[q.skill] = (wk[q.skill] || 0) + 1; });
      const w = Object.entries(wk).sort((a, b) => b[1] - a[1])[0];
      if (w && w[1] >= 2) improve.push(`📌 ‘${w[0]}’ 유형에서 ${w[1]}개 틀렸어요 → 내일 이 유형부터 다시 만나요`);
    }
    const stillPending = fixes.filter(a => !a.ok).length;
    if (stillPending) improve.push(`🔁 다시 도전했는데 아직 헷갈리는 유형 ${stillPending}개 → 다음 판 맨 앞에 나와요`);
    const did = drill.length + dlog.length + att.length;
    if (did && !praise.length) praise.push('💪 오늘도 끝까지 해냈어요. 꾸준함이 실력이 돼요!');
    const tip = improve.length ? '내일은 위 💪 한 가지만 신경 써 봐요.' : did ? '실수 없이 완벽한 하루! 이대로만 하면 돼요 👍' : '';
    return { did: did > 0, praise: praise.slice(0, 5), improve: improve.slice(0, 4), tip };
  }
  /* ---------- 📝 제출 직후 칭찬·조언: 점수·정확도·걸린 시간(지난번 내 기록과 비교) ----------
     o = {n, ok, sec, prev:[{n, ok, sec}], sureWrong, maybeOk, blanks, reduce, what} */
  function submitFeedback(o) {
    const praise = [], advice = [], n = o.n || 0, ok = o.ok || 0, acc = n ? ok / n : 0, per = n && o.sec ? o.sec / n : null;
    const mm = x => x >= 60 ? Math.floor(x / 60) + '분 ' + Math.round(x % 60) + '초' : Math.round(x) + '초';
    const prev = (o.prev || []).filter(p => p.n && p.sec).slice(-5);
    const pPer = prev.length ? prev.reduce((a, p) => a + p.sec / p.n, 0) / prev.length : null;
    const pAcc = prev.length ? prev.reduce((a, p) => a + p.ok / p.n, 0) / prev.length : null;
    // 점수·정확도
    if (acc === 1) praise.push(`🎯 ${n}문제 모두 정답! 정확도 100%`);
    else if (acc >= 0.8) praise.push(`🎯 ${n}문제 중 ${ok}개 정답 (정확도 ${Math.round(acc * 100)}%) — 거의 다 맞혔어요`);
    else if (acc >= 0.5) praise.push(`👍 ${n}문제 중 ${ok}개 정답 — 절반 이상 맞혔어요`);
    else advice.push(`📖 ${n}문제 중 ${ok}개 정답 — 어려웠죠? 틀린 문제 풀이를 보고 고치면 바로 실력이 돼요`);
    if (pAcc != null && acc > pAcc + 0.1) praise.push(`📈 지난번보다 정확도가 올랐어요 (${Math.round(pAcc * 100)}% → ${Math.round(acc * 100)}%)`);
    // 걸린 시간 (제한 시간이 아니라 내 기록과 비교)
    if (per != null) {
      const timeTxt = `걸린 시간 ${mm(o.sec)} (문제당 ${Math.round(per)}초)`;
      if (pPer != null && per < pPer * 0.9 && acc >= (pAcc ?? 0) - 0.05) praise.push(`⚡ ${timeTxt} — 지난번(문제당 ${Math.round(pPer)}초)보다 빨라졌는데 정확도도 그대로예요!`);
      else if (pPer != null && per < pPer * 0.9) advice.push(`🐢 ${timeTxt} — 지난번보다 빨라졌지만 실수가 늘었어요. 속도보다 정확하게가 먼저!`);
      else if (pPer != null && per > pPer * 1.25 && acc === 1) praise.push(`🧐 ${timeTxt} — 평소보다 천천히, 꼼꼼하게 풀어서 만점이에요`);
      else praise.push(`⏱ ${timeTxt}`);
    }
    if (o.sureWrong) advice.push(`😮 ‘확실해요’ 했는데 틀린 문제 ${o.sureWrong}개 — 덜렁 실수예요. 제출 전에 답을 한 번 더 확인!`);
    if (o.maybeOk) advice.push(`🤔 ‘아마도’로 맞힌 문제 ${o.maybeOk}개 — 풀이를 보면 다음엔 확실해질 거예요`);
    if (o.blanks) advice.push(`⬜ 빈칸 ${o.blanks}개 — 모르면 아는 데까지라도 써 봐요`);
    if (o.reduce) advice.push(`✂️ 약분을 안 해서 틀린 문제 ${o.reduce}개 — 분수 답은 마지막에 "더 나눌 수 있나?"`);
    if (o.hints) advice.push(`💡 힌트를 본 문제 ${o.hints}개 — 다음엔 힌트 없이 먼저 도전해 봐요`);
    if (!advice.length && acc < 1) advice.push('🔧 틀린 문제는 풀이를 보고 어디서 달라졌는지 찾아봐요');
    if (!advice.length) advice.push(acc === 1 ? '👏 지금처럼 정확하게! 다음엔 조금 더 어려운 문제도 해낼 수 있어요' : '');
    return { praise, advice: advice.filter(Boolean) };
  }
  function feedbackHTML(o) {
    const r = submitFeedback(o), li = a => a.map(x => `<li style="margin:3px 0">${String(x).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</li>`).join('');
    return `<div style="text-align:left;border:2px solid #dfe5f0;background:#fbfcff;border-radius:16px;padding:12px 16px;margin:10px 0">
      <div style="font-size:17px;font-weight:900;margin-bottom:4px">💬 선생님 한마디</div>
      ${r.praise.length ? `<div style="font-weight:800;color:#1f9d63">👍 잘했어요</div><ul style="margin:2px 0 6px;padding-left:20px">${li(r.praise)}</ul>` : ''}
      ${r.advice.length ? `<div style="font-weight:800;color:#c45a00">💪 이렇게 해 봐요</div><ul style="margin:2px 0 0;padding-left:20px">${li(r.advice)}</ul>` : ''}</div>`;
  }
  function reportHTML(S, D, title) {
    const r = todayReport(S, D); if (!r.did) return '';
    const li = a => a.map(x => `<li style="margin:3px 0">${String(x).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</li>`).join('');
    return `<div style="text-align:left;border:2px solid #dfe5f0;background:#fff;border-radius:16px;padding:14px 16px;margin:10px 0">
      <div style="font-size:18px;font-weight:900;margin-bottom:6px">💬 ${title || '오늘의 피드백'}</div>
      ${r.praise.length ? `<div style="font-weight:800;color:#1f9d63">👍 잘한 점</div><ul style="margin:2px 0 8px;padding-left:20px">${li(r.praise)}</ul>` : ''}
      ${r.improve.length ? `<div style="font-weight:800;color:#c45a00">💪 더 잘하려면</div><ul style="margin:2px 0 8px;padding-left:20px">${li(r.improve)}</ul>` : ''}
      ${r.tip ? `<div style="color:#5a6680;font-size:14px">${r.tip}</div>` : ''}</div>`;
  }

  // 한 단계를 마친 화면에 붙이는 '다음 단계' 안내 (각 페이지 공용, 인라인 스타일)
  function courseBanner(S, D, startHref) {
    const c = course(S, D), home = startHref || 'start.html';
    const dots = c.steps.map(s => `<span style="display:inline-block;width:28px;height:28px;border-radius:50%;line-height:28px;text-align:center;font-size:15px;margin-right:4px;background:${s.done ? '#1f9d63' : '#e8edf7'};color:${s.done ? '#fff' : '#5a6680'}">${s.done ? '✓' : s.no}</span>`).join('');
    if (!c.next) return `<div style="border:3px solid #1f9d63;background:#e6f7ee;border-radius:18px;padding:16px;margin:0 0 14px;text-align:center">
      <div>${dots}</div><div style="font-size:22px;font-weight:900;margin:8px 0">🎉 ${c.lesson > 1 ? c.lesson + '번째 수업까지' : '오늘의 학습 코스'} 완료!</div>${reportHTML(S, D)}
      ${nextLessonHTML(S, D)}
      <a href="${home}" style="display:inline-block;background:#1f9d63;color:#fff;text-decoration:none;border-radius:14px;padding:12px 20px;font-weight:800;font-size:18px">시작화면으로 →</a></div>`;
    return `<div style="border:3px solid #ff7a1a;background:#fff6ee;border-radius:18px;padding:16px;margin:0 0 14px;text-align:center">
      <div>${dots}</div><div style="font-size:17px;margin:8px 0">🗺️ 오늘의 코스 <b>${c.done}/${c.total}</b> 완료 · 다음은 <b>${c.next.no}. ${c.next.icon} ${c.next.name}</b></div>
      <a href="${c.next.href}" style="display:inline-block;background:linear-gradient(135deg,#ff7a1a,#ff4d6d);color:#fff;text-decoration:none;border-radius:14px;padding:14px 22px;font-weight:900;font-size:20px">${c.next.icon} ${c.next.name} 하러 가기 →</a>${reportHTML(S, D, '지금까지 오늘의 피드백')}</div>`;
  }

  // 코스를 다 마쳤을 때: 힘이 남으면 내일 수업을 오늘 미리 (시작화면 #next 에서 시작)
  function nextLessonHTML(S, D) {
    if (!canNextLesson(S, D)) return lessonNo(S) >= MAX_LESSONS ? '<p style="color:#5a6680;margin:6px 0">오늘은 정말 많이 했어요! 푹 쉬고 내일 만나요 😴</p>' : '';
    const u = index(D).unitById[freshUnit(S, D)];
    return `<div style="border:2px dashed #6a3fd1;background:#f5f0ff;border-radius:16px;padding:12px;margin:10px 0">
      <div style="font-weight:900;font-size:17px">⏭️ 시간이 남았나요? 내일 수업을 미리 해요</div>
      <div style="color:#5a6680;font-size:14px;margin:4px 0 8px">${u ? u.g + '-' + u.s + ' ' + u.title + ' · ' : ''}연산 → 레이스 → 미션을 한 번 더. 힘들면 오늘은 여기까지 해도 충분해요.</div>
      <a href="start.html#next" style="display:inline-block;background:#6a3fd1;color:#fff;text-decoration:none;border-radius:14px;padding:12px 20px;font-weight:900;font-size:18px">⏭️ ${lessonNo(S) + 1}번째 수업 시작 →</a></div>`;
  }

  window.PROGRESS = { RULES, STAGES, unitStage, unitOpen, recommendedUnit, ladder, wrongBox, index,
    DRILL, drillSkills, drillLevel, fluency, unitScore, dailyGrade, dailyUnit, drillLimit, drillOpen, drillRecommend, course, courseBanner, todayReport, dose, missionCounts, lessonNo, missionsToday, xpCap, xpKey, freshUnit, canNextLesson, startNextLesson, nextLessonHTML, MAX_LESSONS, TEST, unitTests, testToday, testDue, testVerdict, RETEST_DAYS, lastTest, testRank, unitDone, remedialUnit, fastTrack, focus, testNext, reportHTML, submitFeedback, feedbackHTML };
})();

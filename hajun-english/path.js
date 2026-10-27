// App-specific learning path. It does not assign a CEFR or school grade.
(function () {
  const names = ['미측정', '문장 발견', '장면 이해', '단서 추론', '생각 표현'];
  const descriptions = [
    '먼저 출발점을 확인해요.',
    '짧은 문장의 사람·장소·행동을 찾아요.',
    '이야기 장면을 읽고 핵심 내용을 설명해요.',
    '여러 문장의 단서를 연결해 이유를 말해요.',
    '긴 장면을 읽고 선택과 이유를 내 문장으로 표현해요.'
  ];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));
  const localDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const weekStart = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return localDate(start);
  };
  const distinctCount = (records, predicate) => new Set(records.filter(predicate).map(row => Number(row.chapter))).size;
  function profile(state, now = new Date()) {
    const history = Array.isArray(state.history) ? state.history : [];
    const qualified = history.filter(row => row?.kind === 'chapter' && Number.isInteger(Number(row.chapter)) && Number(row.attempted) >= 4 && Number(row.correct) / Number(row.attempted) >= .75 && Number(row.skipped) <= 1);
    const basic = distinctCount(qualified, row => Number(row.chapter) >= 1 && Number(row.chapter) <= 12);
    const full = distinctCount(qualified, row => Number(row.attempted) >= 6 && row.mode !== 'gentle');
    const middle = distinctCount(qualified, row => Number(row.chapter) >= 5 && Number(row.chapter) <= 8 && Number(row.attempted) >= 6 && row.mode !== 'gentle');
    const final = distinctCount(qualified, row => Number(row.chapter) >= 9 && Number(row.chapter) <= 12 && row.mode === 'challenge' && Number(row.attempted) >= 6);
    const growth = Object.values(state.growth || {});
    const answers = growth.filter(row => typeof row?.answer === 'string' && row.answer.trim().length >= 3).length;
    const personal = growth.filter(row => typeof row?.personal === 'string' && row.personal.trim().length >= 3).length;
    let earned = 1;
    if (basic >= 2 && answers >= 1) earned = 2;
    if (full >= 5 && middle >= 2 && answers >= 3 && personal >= 1) earned = 3;
    if (earned >= 3 && full >= 9 && final >= 2 && answers >= 6 && personal >= 3) earned = 4;
    const placement = state.placement;
    const diagnostic = !placement ? 0 : placement.correct >= 8 && placement.high >= 2 ? 3 : placement.correct >= 4 ? 2 : 1;
    const stage = Math.max(diagnostic, basic > 0 ? earned : 0);
    const target = stage >= 4 ? 4 : Math.max(stage + 1, clamp(state.goal?.targetStage, 2, 4));
    const weeklyDays = clamp(state.goal?.weeklyDays, 2, 5);
    const days = [...new Set(Array.isArray(state.studyDays) ? state.studyDays.filter(x => typeof x === 'string') : [])];
    const start = weekStart(now), end = localDate(now);
    const weekCount = days.filter(day => day >= start && day <= end).length;
    const requirements = target === 2 ? [
      {label:'서로 다른 장면 퀴즈에서 혼자 75% 이상', value:basic, need:2, action:'짧은 지문을 읽고 독해 미션 풀기'},
      {label:'이야기를 내 영어 문장으로 쓰기', value:answers, need:1, action:'말하고 쓰기 탭에서 영어 문장 1개 적기'}
    ] : target === 3 ? [
      {label:'6문항 이상 퀴즈에서 혼자 75% 이상', value:full, need:5, action:'탐험 또는 도전 난이도로 독해 미션 풀기'},
      {label:'5~8단원에서 혼자 75% 이상', value:middle, need:2, action:'5~8단원 지문 읽고 퀴즈 풀기'},
      {label:'이야기 영어 문장 쓰기', value:answers, need:3, action:'말하고 쓰기 탭에서 이야기 문장 적기'},
      {label:'내 생활 영어 문장 쓰기', value:personal, need:1, action:'내 생활과 연결한 영어 문장 적기'}
    ] : [
      {label:'6문항 이상 퀴즈에서 혼자 75% 이상', value:full, need:9, action:'새 장면을 읽고 독해 미션 풀기'},
      {label:'5~8단원에서 혼자 75% 이상', value:middle, need:2, action:'5~8단원 지문 읽고 퀴즈 풀기'},
      {label:'9~12단원 도전 퀴즈에서 혼자 75% 이상', value:final, need:2, action:'9~12단원을 도전 난이도로 풀기'},
      {label:'이야기 영어 문장 쓰기', value:answers, need:6, action:'이야기를 한 문장으로 설명하기'},
      {label:'내 생활 영어 문장 쓰기', value:personal, need:3, action:'내 생각과 이유를 영어로 적기'}
    ];
    const next = requirements.find(item => item.value < item.need);
    return {names, descriptions, stage, diagnostic, earned, provisional:diagnostic > earned, target, weeklyDays, weekCount, requirements, next, start};
  }
  function markDay(state, now = new Date()) {
    const day = localDate(now);
    state.studyDays = Array.isArray(state.studyDays) ? state.studyDays : [];
    if (state.studyDays.includes(day)) return false;
    state.studyDays.push(day);
    state.studyDays = state.studyDays.slice(-365);
    return true;
  }
  window.MAGIC_PATH = {profile, markDay, weekStart};
})();

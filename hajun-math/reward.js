/* 🎉 칭찬과 보상 (2026-11-27)
   - 연산·복습·미션을 한 판/한 번 마칠 때마다: 실제 결과에 맞춘 칭찬 + 얻은 경험치 + 오늘 코스 도장.
   - 단계를 다 마치면 스티커 1장, 오늘 코스를 모두 마치면 🎁 보물상자(희귀 이상 스티커).
   - 스티커는 S.rewards = {stickers: {id: 개수}, got: {날짜|수업|단계: 스티커id}} 에 저장 (같은 단계로 두 번 받지 않음).
   - 사용: RW.celebrate(S, D, 'drill'|'daily'|'mission', info, save)  → 화면에 축하 창을 띄움. */
(function () {
  const P = window.PROGRESS;
  const STICKERS = [
    // 보통 (24)
    ['s01', '🐣', '병아리'], ['s02', '🐶', '강아지'], ['s03', '🐱', '고양이'], ['s04', '🐰', '토끼'], ['s05', '🐻', '곰'], ['s06', '🐼', '판다'],
    ['s07', '🐨', '코알라'], ['s08', '🐯', '호랑이'], ['s09', '🦁', '사자'], ['s10', '🐸', '개구리'], ['s11', '🐵', '원숭이'], ['s12', '🐧', '펭귄'],
    ['s13', '🦊', '여우'], ['s14', '🐢', '거북이'], ['s15', '🐬', '돌고래'], ['s16', '🦒', '기린'], ['s17', '🐘', '코끼리'], ['s18', '🦔', '고슴도치'],
    ['s19', '🍀', '네잎클로버'], ['s20', '⚽', '축구공'], ['s21', '🚲', '자전거'], ['s22', '🎈', '풍선'], ['s23', '🍕', '피자'], ['s24', '🍩', '도넛'],
    // 희귀 (12)
    ['r01', '🦉', '지혜의 부엉이'], ['r02', '🦅', '독수리'], ['r03', '🐙', '문어 박사'], ['r04', '🦈', '상어'], ['r05', '🚀', '로켓'], ['r06', '🛸', '비행접시'],
    ['r07', '🌋', '화산'], ['r08', '🏰', '성'], ['r09', '🎸', '기타'], ['r10', '🤖', '로봇'], ['r11', '🧭', '나침반'], ['r12', '🔭', '망원경'],
    // 전설 (4)
    ['l01', '🦄', '유니콘'], ['l02', '🐉', '수학 드래곤'], ['l03', '👑', '계산왕 왕관'], ['l04', '💎', '무한 다이아몬드']
  ];
  const RANK = id => id[0] === 'l' ? 2 : id[0] === 'r' ? 1 : 0, RNAME = ['보통', '희귀', '전설'], RCOLOR = ['#5b8def', '#a35bef', '#f0a020'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function store(S) { S.rewards = S.rewards || {}; S.rewards.stickers = S.rewards.stickers || {}; S.rewards.got = S.rewards.got || {}; return S.rewards; }
  function draw(S, minRank, luck) {                     // 아직 없는 스티커가 먼저 나오도록
    const R = store(S), roll = Math.random() + (luck || 0);
    let rank = roll > 0.97 ? 2 : roll > 0.75 ? 1 : 0; rank = Math.max(rank, minRank || 0);
    const pool = STICKERS.filter(s => RANK(s[0]) === rank), fresh = pool.filter(s => !R.stickers[s[0]]);
    const s = pick(fresh.length ? fresh : pool); R.stickers[s[0]] = (R.stickers[s[0]] || 0) + 1; return s;
  }
  function album(S) { const R = store(S); return { have: STICKERS.filter(s => R.stickers[s[0]]).length, total: STICKERS.length }; }

  // ---------- 칭찬 문장 (결과에 맞춰) ----------
  function praise(step, i) {
    const L = [];
    if (step === 'drill') {
      if (i.wrong === 0) L.push(pick(['실수 0개! 완벽한 계산이에요 💯', '하나도 안 틀렸어요! 계산 천재 💯', '전부 정답! 손이 척척이에요 💯']));
      else if (i.wrong === 1) L.push(pick(['딱 하나만 틀렸어요. 거의 완벽해요! 👍', '한 문제 빼고 다 맞혔어요! 👍']));
      else L.push(pick(['끝까지 해낸 게 정말 멋져요! 💪', '포기하지 않고 끝까지! 그게 실력이 되는 거예요 💪']));
      if (i.record) L.push('⏱ 최고 기록을 깼어요!');
      if (i.mastered) L.push('🎓 이 연산을 완전히 익혔어요!');
    } else if (step === 'daily') {
      const r = i.n ? i.ok / i.n : 0;
      if (r >= 1) L.push(pick(['기억력 만점! 배운 걸 하나도 안 잊었어요 🧠', '전부 기억해 냈어요! 머릿속에 쏙 들어 있네요 🧠']));
      else if (r >= 0.8) L.push(pick(['거의 다 기억했어요! 대단해요 👏', '잊을 만한 걸 잘 떠올렸어요 👏']));
      else L.push(pick(['다시 풀어 본 덕분에 이제 더 오래 기억할 거예요 🌱', '헷갈린 건 오늘 다시 봤으니 괜찮아요. 이렇게 단단해져요 🌱']));
      if (i.gap >= 3) L.push(`📅 ${i.gap}일 전에 배운 것도 기억해 냈어요!`);
      if (i.fixed) L.push(`🔧 틀린 문제 ${i.fixed}개를 바로 고쳤어요!`);
    } else if (step === 'mission') {
      const r = i.total ? i.first / i.total : 0;
      if (r >= 0.9) L.push(pick(['새 개념을 완전히 내 것으로 만들었어요! 🌟', '오늘 배운 걸 거의 다 혼자 풀었어요! 🌟']));
      else if (r >= 0.7) L.push(pick(['오늘 새로운 걸 배우고 잘 해냈어요! ✨', '기본도 응용도 씩씩하게 해냈어요! ✨']));
      else L.push(pick(['어려운 걸 끝까지 해냈어요. 오늘 머리가 쑥 자랐어요! 🌱', '처음 배우는 건 원래 어려워요. 끝까지 한 게 최고예요! 🌱']));
      if (i.total) L.push(`혼자 맞힌 문제 ${i.first} / ${i.total}`);
      if (i.reflect) L.push('✍️ 돌아보기까지 꼼꼼하게 썼어요!');
    } else if (step === 'test') {
      L.push(pick(['힌트 없이 15문제를 끝까지 풀었어요! 진짜 실력이에요 🏁', '단원 마무리 테스트 완주! 정말 대단해요 🏁']));
      if (i.total) L.push(`${i.total}문제 중 ${i.first}문제 정답`);
    } else if (step === 'review') {
      L.push(pick(['틀렸던 문제를 해설 없이 다시 풀었어요! 🎓', '일주일 전 실수를 이겨 냈어요! 🎓']));
      if (i.total) L.push(`${i.total}문제 중 ${i.first}문제 졸업`);
    }
    return L;
  }

  // ---------- 축하 창 ----------
  function css() {
    if (document.getElementById('rw-css')) return;
    const st = document.createElement('style'); st.id = 'rw-css';
    st.textContent = `.rw-bg{position:fixed;inset:0;background:#0008;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:rwf .25s}
.rw-box{background:#fff;border-radius:24px;max-width:430px;width:100%;padding:24px 20px;text-align:center;box-shadow:0 20px 60px #0005;animation:rwp .45s cubic-bezier(.2,1.6,.4,1);position:relative;overflow:hidden}
.rw-big{font-size:64px;line-height:1.1;animation:rwb 1s ease-in-out infinite alternate}.rw-h{font-size:24px;font-weight:900;margin:6px 0 10px;color:#1d2b4a}
.rw-p{font-size:17px;margin:6px 0;color:#33415c;font-weight:700}.rw-xp{display:inline-block;background:#fff3c4;color:#8a5a00;border-radius:99px;padding:6px 14px;font-weight:900;margin:8px 0}
.rw-st{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:12px 0 4px}.rw-st span{width:66px;height:66px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:24px;background:#eef1f6;border:2px dashed #c5cede}
.rw-st span.on{background:#e3f8ec;border:2px solid #31b56a}.rw-st small{display:block;font-size:11px;color:#6a7590;margin-top:2px}
.rw-stk{margin:14px auto 4px;padding:12px;border-radius:18px;border:3px solid;max-width:260px;animation:rwp .6s .2s both cubic-bezier(.2,1.6,.4,1)}.rw-stk b{font-size:54px;display:block}
.rw-btn{margin-top:14px;border:0;border-radius:14px;padding:14px 28px;font-size:18px;font-weight:900;color:#fff;background:linear-gradient(135deg,#ff7a1a,#ff4d6d);cursor:pointer}
.rw-c{position:absolute;top:-12px;font-size:20px;animation:rwc 2.2s linear forwards;z-index:0;opacity:.8;pointer-events:none}.rw-box>*:not(.rw-c){position:relative;z-index:1}
@keyframes rwf{from{opacity:0}}@keyframes rwp{from{transform:scale(.6);opacity:0}}@keyframes rwb{to{transform:scale(1.12) rotate(4deg)}}@keyframes rwc{to{transform:translateY(560px) rotate(540deg);opacity:0}}`;
    document.head.appendChild(st);
  }
  function show(html, onClose) {
    if (window.__NO_CELEBRATE) { if (onClose) onClose(); return; }       // 자동 테스트용
    css(); const bg = document.createElement('div'); bg.className = 'rw-bg';
    const conf = Array.from({ length: 18 }, (_, k) => `<span class="rw-c" style="left:${(k * 37) % 100}%;animation-delay:${(k % 6) * 0.12}s">${['🎉', '⭐', '✨', '🎊'][k % 4]}</span>`).join('');
    bg.innerHTML = `<div class="rw-box" role="dialog" aria-label="칭찬">${conf}${html}<br><button class="rw-btn">좋아요! 👍</button></div>`;
    const close = () => { bg.remove(); if (onClose) onClose(); };
    bg.querySelector('.rw-btn').onclick = close; bg.onclick = e => { if (e.target === bg) close(); };
    document.body.appendChild(bg);
  }
  const ICON = { drill: '⚡', daily: '🔁', mission: '📚', test: '🏁', review: '🗓️' }, NAME = { drill: '연산', daily: '복습', mission: '오늘의 미션', test: '단원 테스트', review: '토요일 복습' };

  function celebrate(S, D, step, info, save, onClose) {
    info = info || {};
    const R = store(S), t = P.course(S, D), k = P.lessonNo ? P.lessonNo(S) : 1, day = new Date(), T = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    const main = t.steps, me = main.find(s => s.key === step);   // 코스 전체(테스트·토요일 복습이 있는 날은 그것까지)
    const prizes = [];
    if (me && me.done && !R.got[T + '|' + k + '|' + step]) { const s = draw(S, 0, info.perfect ? 0.2 : 0); R.got[T + '|' + k + '|' + step] = s[0]; prizes.push(['스티커', s]); }
    const allDone = main.length && main.every(s => s.done);
    if (allDone && !R.got[T + '|' + k + '|chest']) { const s = draw(S, 1, 0.1); R.got[T + '|' + k + '|chest'] = s[0]; prizes.push(['🎁 보물상자', s]); }
    if (save) save();
    const lines = praise(step, info), al = album(S);
    const stamps = main.map(s => `<span class="${s.done ? 'on' : ''}">${s.done ? '✅' : ICON[s.key]}<small>${NAME[s.key]}</small></span>`).join('');
    const prog = me && !me.done && info.left ? `<div class="rw-p" style="color:#6a7590">${NAME[step]} ${info.left}판 더 하면 스티커를 받아요!</div>` : '';
    const stk = prizes.map(([lab, s]) => `<div class="rw-stk" style="border-color:${RCOLOR[RANK(s[0])]}"><div style="font-weight:900;color:${RCOLOR[RANK(s[0])]}">${lab} · ${RNAME[RANK(s[0])]}</div><b>${s[1]}</b><div style="font-weight:800">${s[2]}${R.stickers[s[0]] > 1 ? ` ×${R.stickers[s[0]]}` : ' (새 스티커!)'}</div></div>`).join('');
    const head = allDone && prizes.some(p => p[0] !== '스티커') ? ['🏆', '오늘 코스 완주!'] : [pick(['🎉', '🌟', '🥳', '👏']), pick(['잘했어요, 하준!', '최고예요, 하준!', '멋져요, 하준!', '해냈어요, 하준!'])];
    show(`<div class="rw-big">${head[0]}</div><div class="rw-h">${head[1]}</div>${lines.map(x => `<div class="rw-p">${x}</div>`).join('')}
      ${info.xp ? `<div class="rw-xp">+${info.xp} XP</div>` : ''}<div class="rw-st">${stamps}</div>${prog}${stk}
      ${allDone ? '' : `<div class="rw-p" style="font-size:14px;color:#6a7590">${main.filter(s => !s.done).map(s => NAME[s.key]).join(' · ')}까지 마치면 🎁 보물상자!</div>`}
      <div style="font-size:13px;color:#6a7590;margin-top:6px">📒 스티커 도감 ${al.have} / ${al.total}</div>`, onClose);
  }

  // 시작 화면용 스티커 도감 카드
  function albumHTML(S) {
    const R = store(S), al = album(S);
    return `<div class="card"><h2>📒 내 스티커 도감 <span class="muted" style="font-weight:400">${al.have} / ${al.total} · 연산·복습·미션을 마치면 1장, 오늘 코스를 다 하면 🎁 보물상자</span></h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px">${STICKERS.map(s => { const n = R.stickers[s[0]];
        return `<div title="${n ? s[2] : '아직 못 모음'}" style="text-align:center;border-radius:12px;padding:6px 2px;border:2px solid ${n ? RCOLOR[RANK(s[0])] : '#e2e6ee'};background:${n ? '#fff' : '#f3f5f9'}"><div style="font-size:30px;${n ? '' : 'filter:grayscale(1) opacity(.25)'}">${n ? s[1] : '❔'}</div><div style="font-size:11px;color:#6a7590">${n ? s[2] + (n > 1 ? ' ×' + n : '') : RNAME[RANK(s[0])]}</div></div>`; }).join('')}</div></div>`;
  }

  window.RW = { STICKERS, celebrate, albumHTML, album, draw, praise };
})();

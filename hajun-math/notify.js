/* ---------------------------------------------------------------
   📱 부모님 휴대폰 알림 (ntfy.sh, 2026-11-24)
   - 코스 단계(연산·레이스·미션·토요일 복습)를 마칠 때마다 결과 요약을 부모님 휴대폰으로 보낸다.
   - 알림 채널 이름은 코드에 넣지 않는다. 아이패드에서 한 번 start.html?alert=채널이름 으로 열면
     이 기기에만 저장된다. (채널 이름을 모르는 사람은 알림을 볼 수 없음)
   - 인터넷이 끊겨 못 보낸 알림은 다음에 기록이 저장될 때 다시 보낸다.
   - progress.js, mission_data.js 다음에 불러와야 한다.
---------------------------------------------------------------- */
(function () {
  const STORE = 'hajun_math_mission_v1', TKEY = 'hajun_notify_topic', SKEY = 'hajun_notify_sent', SERVER = 'https://ntfy.sh/';
  const P = window.PROGRESS, D = window.MISSION_DATA;
  const ls = window.localStorage, rawSet = Storage.prototype.setItem;
  const get = k => { try { return ls.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { rawSet.call(ls, k, v); } catch (e) {} };

  const topic = () => get(TKEY);
  // 처음 설정: 주소에 ?alert=채널이름 이 있으면 이 기기에 저장하고 주소에서는 지운다 (?alert=off 는 끄기)
  const q = new URLSearchParams(location.search), qa = q.get('alert');
  if (qa != null) {
    if (qa === 'off') { try { ls.removeItem(TKEY); } catch (e) {} }
    else if (/^[A-Za-z0-9_-]{12,64}$/.test(qa)) { put(TKEY, qa); send('🔔 알림 연결 완료', '이제 하준이가 공부 단계를 마칠 때마다 이 휴대폰으로 알려 드려요.', ['white_check_mark']); }
    q.delete('alert'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
  }
  function send(title, message, tags) {
    const t = topic(); if (!t) return Promise.resolve(false);
    return fetch(SERVER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ topic: t, title, message, tags: tags || [] }) }).then(r => r.ok).catch(() => false);
  }

  const ymd = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mm = s => Math.floor(s / 60) + '분 ' + (s % 60) + '초';
  const stars = n => '⭐'.repeat(n || 0) || '☆';
  const unitName = id => { const u = D && D.units.find(x => x.id === id); return u ? `${u.g}-${u.s} ${u.title}` : ''; };
  const skill = id => ((P && P.DRILL.skills.find(k => k.id === id)) || {}).name || id;

  // 지금 기록에서 '이미 끝났는데 아직 안 알린 일'을 찾는다
  function events(S) {
    const t = ymd(), c = P.course(S, D), k = c.lesson, n = c.dose, out = [], pre = t + '|L' + k + '|';
    const drill = ((S.drill && S.drill.log) || []).filter(r => r.date === t), race = ((S.daily && S.daily.log) || []).filter(r => r.date === t);
    if (drill.length + race.length + (S.attempts || []).filter(a => a.date === t).length)
      out.push({ key: t + '|start', title: '📘 하준이가 오늘 수학 공부를 시작했어요', msg: `오늘 단원: ${unitName(P.dailyUnit(S, D))}` });
    c.steps.forEach(st => {
      if (!st.done) return;
      const tag = k > 1 ? ` (${k}번째 수업)` : '';
      if (st.key === 'drill') { const L = drill.slice(n * (k - 1), n * k);
        out.push({ key: pre + 'drill', title: `⚡ 연산 ${L.length}판 완료${tag}`, msg: L.map(r => `${skill(r.skill)} ${stars(r.stars)} · ${mm(r.sec)} · ${r.wrong ? '실수 ' + r.wrong + '개' : '실수 0'}`).join('\n') }); }
      if (st.key === 'daily') { const L = race.slice(n * (k - 1), n * k);
        out.push({ key: pre + 'daily', title: `🏃 레이스 ${L.length}판 완료${tag}`, msg: L.map(r => `${r.round}판 ${stars(r.stars)} 첫 번에 ${r.firstOk}/${r.n} · 게이지 ${r.startScore}→${r.score}`).join('\n') + (L[0] ? `\n단원: ${unitName(L[0].unit)}` : '') }); }
      if (st.key === 'mission') { const d = (S.days || {})[t] || {};
        const res = d.status === 'success' ? '⭐ 성공 (틀린 유형도 새 문제로 혼자 해결)' : '📘 공부 완료 (혼자 풀기 확인은 다음에)';
        out.push({ key: pre + 'mission', title: `📚 미션 완료${tag}`, msg: `${unitName(d.unitId)}\n${res}\n오늘 처음 푼 문제 정답 ${d.firstOk || 0}/${d.total || 0}${d.feel ? '\n기분 ' + d.feel : ''}${d.note ? '\n돌아보기: “' + d.note + '”' : ''}` }); }
      if (st.key === 'review') { const ok = (S.wrong || []).filter(w => w.satDate === t).length;
        out.push({ key: pre + 'review', title: '🗓️ 토요일 복습 완료', msg: `처음 틀렸던 문제 중 ${ok}개를 해설 없이 다시 맞혔어요` }); }
    });
    if (!c.next) {
      const r = P.todayReport(S, D), st = P.unitStage(S, D, P.dailyUnit(S, D));
      out.push({ key: pre + 'all', title: `🎉 ${k > 1 ? k + '번째 수업까지' : '오늘 학습 코스'} 모두 완료!`, tags: ['tada'],
        msg: [...r.praise.map(x => '👍 ' + x), ...r.improve.map(x => '💪 ' + x), `단원 진도: ${unitName(P.dailyUnit(S, D))} ${st.icon} ${st.name}`].join('\n') });
    }
    return out;
  }

  let busy = false, again = false;
  function check() {
    if (!topic() || !P || !D) return;
    if (busy) { again = true; return; }
    let S; try { S = JSON.parse(get(STORE)); } catch (e) { return; } if (!S) return;
    let sent; try { sent = JSON.parse(get(SKEY)) || {}; } catch (e) { sent = {}; }
    const t = ymd(); Object.keys(sent).forEach(x => { if (x.slice(0, 10) < t) delete sent[x]; });   // 지난 날짜 기록은 정리
    let todo; try { todo = events(S).filter(e => !sent[e.key]); } catch (e) { return; }
    if (!todo.length) return;
    busy = true;
    todo.reduce((p, e) => p.then(() => send(e.title, e.msg, e.tags).then(ok => { if (ok) { sent[e.key] = 1; put(SKEY, JSON.stringify(sent)); } })), Promise.resolve())
      .finally(() => { busy = false; if (again) { again = false; check(); } });
  }

  // 각 화면의 save()가 기록을 저장할 때마다 확인 (화면 코드는 고치지 않음)
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === ls && k === STORE) setTimeout(check, 50); };
  window.addEventListener('online', check);
  setTimeout(check, 500);
  window.NOTIFY = { on: () => !!topic(), test: () => send('🧪 시험 알림', '하준이 수학 알림이 잘 와요!', ['bell']), check, events };
})();

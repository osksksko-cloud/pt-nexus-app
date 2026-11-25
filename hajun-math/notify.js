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
  // ❌ 틀린 문제 목록 (문제 · 내 답 → 정답). 한 알림에 최대 MAXW개, 나머지는 개수만
  const MAXW = 8, cut = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  function wrongBlock(lines) {
    if (!lines.length) return '';
    return `\n\n❌ 틀린 문제 ${lines.length}개\n` + lines.slice(0, MAXW).join('\n') + (lines.length > MAXW ? `\n…외 ${lines.length - MAXW}문제 (부모님 확인 화면에서 전체 보기)` : '');
  }
  // 문제은행 문제 한 줄: 틀린 뒤 같은 유형 새 숫자 문제로 고쳤는지도 표시
  function bankLine(S, a, src) {
    const q = P.index(D).byId[a.qid]; if (!q) return null;
    const ans = q.a.display + (q.a.unit && !String(q.a.display).endsWith(q.a.unit) ? ' ' + q.a.unit : '');
    const fixed = (S.attempts || []).some(b => b.mode === 'repair' && b.f === a.f && b.ok && b.at > a.at && (b.src || '') === src);
    return `• ${cut(q.stem, 48)}\n   내 답 ${a.ans || '빈칸'} → 정답 ${ans}${fixed ? ' (✅ 새 문제로 고침)' : ''}`;
  }

  // 지금 기록에서 '이미 끝났는데 아직 안 알린 일'을 찾는다
  function events(S) {
    const t = ymd(), c = P.course(S, D), k = c.lesson, n = c.dose, out = [], pre = t + '|L' + k + '|';
    // 이미 알린 틀린 문제는 다시 넣지 않음 (key: 날짜|w|시각|문제)
    const wk = a => t + '|w|' + a.at + '|' + a.qid, fresh = list => list.filter(a => a.at && !sentNow[wk(a)]);
    const firstWrong = src => fresh((S.attempts || []).filter(a => a.date === t && !a.ok && (a.mode === 'basic' || a.mode === 'app') && (a.src || '') === src));
    const drill = ((S.drill && S.drill.log) || []).filter(r => r.date === t), race = ((S.daily && S.daily.log) || []).filter(r => r.date === t);
    if (drill.length + race.length + (S.attempts || []).filter(a => a.date === t).length)
      out.push({ key: t + '|start', title: '📘 하준이가 오늘 수학 공부를 시작했어요', msg: `오늘 단원: ${unitName(P.dailyUnit(S, D))}` });
    c.steps.forEach(st => {
      if (!st.done) return;
      const tag = k > 1 ? ` (${k}번째 수업)` : '';
      if (st.key === 'drill') { const L = drill.slice(n * (k - 1), n * k);
        const miss = L.flatMap(r => (r.miss || []).map(m => `• ${cut(m.q, 30)} : 내 답 ${m.a || '빈칸'} → 정답 ${m.c}${m.why ? ' (' + m.why + ')' : ''}${m.fixed ? ' ✅고침' : ''}`));
        out.push({ key: pre + 'drill', title: `⚡ 연산 ${L.length}판 완료${tag}`, msg: L.map(r => `${skill(r.skill)} ${stars(r.stars)} · ${mm(r.sec)} · ${r.wrong ? '실수 ' + r.wrong + '개' : '실수 0'}`).join('\n') + wrongBlock(miss) }); }
      if (st.key === 'daily') { const L = race.slice(n * (k - 1), n * k);
        const bw = firstWrong('daily'), aw = ((S.daily && S.daily.arithMiss) || []).filter(m => m.date === t && m.at && !sentNow[t + '|wa|' + m.at]);
        const lines = [...aw.map(m => `• ${cut(m.q, 30)} : 내 답 ${m.a} → 정답 ${m.c}`), ...bw.map(a => bankLine(S, a, 'daily')).filter(Boolean)];
        out.push({ key: pre + 'daily', title: `🏃 레이스 ${L.length}판 완료${tag}`, marks: [...bw.map(wk), ...aw.map(m => t + '|wa|' + m.at)],
          msg: L.map(r => `${r.round}판 ${stars(r.stars)} 첫 번에 ${r.firstOk}/${r.n} · 게이지 ${r.startScore}→${r.score}`).join('\n') + (L[0] ? `\n단원: ${unitName(L[0].unit)}` : '') + wrongBlock(lines) }); }
      if (st.key === 'mission') { const d = (S.days || {})[t] || {};
        const res = d.status === 'success' ? '⭐ 성공 (틀린 유형도 새 문제로 혼자 해결)' : '📘 공부 완료 (혼자 풀기 확인은 다음에)';
        const mw = firstWrong('');
        out.push({ key: pre + 'mission', title: `📚 미션 완료${tag}`, marks: mw.map(wk),
          msg: `${unitName(d.unitId)}\n${res}\n오늘 처음 푼 문제 정답 ${d.firstOk || 0}/${d.total || 0}${d.feel ? '\n기분 ' + d.feel : ''}${d.note ? '\n돌아보기: “' + d.note + '”' : ''}` + wrongBlock(mw.map(a => bankLine(S, a, '')).filter(Boolean)) }); }
      if (st.key === 'test') { const r = P.testToday(S); if (r) { const v = P.testVerdict(r);
        const tw = fresh((S.attempts || []).filter(a => a.date === t && a.mode === 'test' && !a.ok)), lvName = { 1: '기본', 2: '응용', 3: '심화' }, idx = P.index(D).byId;
        out.push({ key: t + '|test|' + r.uid, title: `🏁 단원 마무리 테스트 · ${unitName(r.uid)}`, marks: tw.map(wk),
          msg: `${v.icon} ${v.name}\n기본 ${r.b[0]}/${r.b[1]} · 응용 ${r.a[0]}/${r.a[1]} · 심화 ${r.v[0]}/${r.v[1]} (총 ${r.ok}/${r.n})${r.sec ? ' · ' + mm(r.sec) : ''}\n${v.tip}\n➡️ ${P.testNext(S, D, r.uid, r)}`
            + wrongBlock(tw.map(a => { const l = bankLine(S, a, '__none'); return l && idx[a.qid] ? l.replace('• ', `• [${lvName[idx[a.qid].d] || ''}] `) : l; }).filter(Boolean)) }); } }
      if (st.key === 'review') { const ok = (S.wrong || []).filter(w => w.satDate === t).length;
        const rw = fresh((S.attempts || []).filter(a => a.date === t && a.mode === 'saturday' && !a.ok));
        out.push({ key: pre + 'review', title: '🗓️ 토요일 복습 완료', marks: rw.map(wk), msg: `처음 틀렸던 문제 중 ${ok}개를 해설 없이 다시 맞혔어요` + wrongBlock(rw.map(a => bankLine(S, a, '__none')).filter(Boolean)).replace('❌ 틀린 문제', '❌ 아직 헷갈리는 문제') }); }
    });
    if (!c.next) {
      const r = P.todayReport(S, D), st = P.unitStage(S, D, P.dailyUnit(S, D));
      out.push({ key: pre + 'all', title: `🎉 ${k > 1 ? k + '번째 수업까지' : '오늘 학습 코스'} 모두 완료!`, tags: ['tada'],
        msg: [...r.praise.map(x => '👍 ' + x), ...r.improve.map(x => '💪 ' + x), `단원 진도: ${unitName(P.dailyUnit(S, D))} ${st.icon} ${st.name}`].join('\n') });
    }
    return out;
  }

  let busy = false, again = false, sentNow = {};
  function check() {
    if (!topic() || !P || !D) return;
    if (busy) { again = true; return; }
    let S; try { S = JSON.parse(get(STORE)); } catch (e) { return; } if (!S) return;
    let sent; try { sent = JSON.parse(get(SKEY)) || {}; } catch (e) { sent = {}; }
    const t = ymd(); Object.keys(sent).forEach(x => { if (x.slice(0, 10) < t) delete sent[x]; });   // 지난 날짜 기록은 정리
    sentNow = sent; let todo; try { todo = events(S).filter(e => !sent[e.key]); } catch (e) { return; }
    if (!todo.length) return;
    busy = true;
    todo.reduce((p, e) => p.then(() => send(e.title, e.msg, e.tags).then(ok => { if (ok) { sent[e.key] = 1; (e.marks || []).forEach(m => { sent[m] = 1; }); put(SKEY, JSON.stringify(sent)); } })), Promise.resolve())
      .finally(() => { busy = false; if (again) { again = false; check(); } });
  }

  // 각 화면의 save()가 기록을 저장할 때마다 확인 (화면 코드는 고치지 않음)
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === ls && k === STORE) setTimeout(check, 50); };
  window.addEventListener('online', check);
  setTimeout(check, 500);
  function connect(t) { t = String(t || '').trim(); if (!/^[A-Za-z0-9_-]{12,64}$/.test(t)) return Promise.resolve(false);
    put(TKEY, t); return send('🔔 알림 연결 완료', '이제 하준이가 공부 단계를 마칠 때마다 이 휴대폰으로 알려 드려요.', ['white_check_mark']).then(ok => { check(); return ok; }); }
  window.NOTIFY = { on: () => !!topic(), connect, test: () => send('🧪 시험 알림', '하준이 수학 알림이 잘 와요!', ['bell']), check, events };
})();

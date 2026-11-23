/* 문제은행 문항 채점 (mission.html 의 채점 코드와 같은 규칙 — 한쪽을 고치면 다른 쪽도 같이 고칠 것)
   window.GRADING.grade(q, text) → {ok} | {ok:false, msg, retry|empty} */
(function(){
/* ---------- 정답 판정 (문제은행 answer_rules.py 와 같은 규칙) ---------- */
const UNIT_ALIASES = {'cm²':['cm²','cm2','㎠','제곱센티미터'],'m²':['m²','m2','㎡','제곱미터'],'cm³':['cm³','cm3','㎤','세제곱센티미터'],'m³':['m³','m3','㎥'],
  'L':['L','l','리터'],'mL':['mL','ml','밀리리터'],'°':['°','도'],'°C':['°C','℃','도'],'cm':['cm','㎝','센티미터'],'m':['m','미터'],'kg':['kg','킬로그램'],'g':['g','그램'],'%':['%','퍼센트']};
function gcd(a,b){ a=a<0n?-a:a; b=b<0n?-b:b; while(b){ [a,b]=[b,a%b]; } return a; }
function frac(n,d){ n=BigInt(n); d=BigInt(d); if(d===0n) throw 0; const g=gcd(n,d)||1n; return [n/g, d/g]; }
function decToFrac(s){ const [i,f=''] = s.split('.'); return frac(BigInt(i+f), 10n**BigInt(f.length)); }
function parseValue(text, unit){
  let s = String(text).trim().replace(/\s+/g,' ');
  const aliases = unit ? (UNIT_ALIASES[unit] || [unit]) : [];
  [...aliases, unit].filter(Boolean).sort((a,b)=>b.length-a.length).some(u => { if (s.endsWith(u)) { s = s.slice(0, -u.length).trim(); return true; } });
  s = s.replace(/[개명번권장마리대자루컵배바퀴쪽원가지시간살일]$/,'').trim();   // "12개"처럼 셈 단위가 붙은 경우
  if (s.includes(',')) { if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) throw '쉼표'; s = s.replace(/,/g,''); }
  let m = s.match(/^(\d+)\s*(?:와|과|\s)\s*(\d+)\s*\/\s*(\d+)$/);
  if (m) { const w=BigInt(m[1]), n=BigInt(m[2]), d=BigInt(m[3]); if (d===0n || n>=d) throw '대분수'; return {v: frac(w*d+n, d), raw:[n,d]}; }
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (m) return {v: frac(m[1], m[2]), raw:[BigInt(m[1]),BigInt(m[2])]};
  if (/^\d+(\.\d+)?$/.test(s)) return {v: decToFrac(s), raw:null};
  throw '형식';
}
function storedValue(v){ const s=String(v); if (s.includes('/')){ const [n,d]=s.split('/'); return frac(n,d); } return s.includes('.') ? decToFrac(s) : frac(s,1); }
function grade(q, text){
  if (!String(text).trim()) return {ok:false, msg:'답을 입력해 주세요.', empty:true};
  try {
    const p = parseValue(text, q.a.unit), want = storedValue(q.a.value);
    const ok = p.v[0] === want[0] && p.v[1] === want[1];
    if (ok && q.a.simp && p.raw && gcd(p.raw[0], p.raw[1]) !== 1n) return {ok:false, msg:'값은 맞아요! 더 간단한 분수(기약분수)로 써 보세요.', retry:true};
    return {ok};
  } catch(e) { return {ok:false, msg:'숫자, 분수(3/4), 대분수(1과 3/4) 형태로 써 주세요.', retry:true}; }
}


window.GRADING = { grade, parseValue, storedValue };
})();

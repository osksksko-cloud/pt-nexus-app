/* ⚡ 연산 문제 만들기 · 답 읽기 (drill.html, daily.html 공용). 정답은 정수·분수로 정확히 계산 */
(function(){
const P = window.PROGRESS;
const skillById = Object.fromEntries(P.DRILL.skills.map(k => [k.id, k]));
/* ---------- 분수 (정확한 계산) ---------- */
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a; }
function F(n,d=1){ if (d<0){ n=-n; d=-d; } const g = gcd(n,d) || 1; return {n:n/g, d:d/g}; }
const add = (x,y) => F(x.n*y.d + y.n*x.d, x.d*y.d), sub = (x,y) => F(x.n*y.d - y.n*x.d, x.d*y.d);
const mul = (x,y) => F(x.n*y.n, x.d*y.d), div = (x,y) => F(x.n*y.d, x.d*y.n);
function frHTML(x, w){ // w: 대분수 정수 부분(있으면)
  return `${w?w:''}<span class="fr"><span>${x.n}</span><span>${x.d}</span></span>`;
}
function showFrac(x){ // 답 보여 주기: 정수 / 대분수 / 진분수
  if (x.d === 1) return String(x.n);
  const w = Math.floor(x.n / x.d), r = x.n % x.d;
  return w ? frHTML({n:r, d:x.d}, w) : frHTML(x);
}
function textFrac(x){ if (x.d === 1) return String(x.n); const w = Math.floor(x.n/x.d), r = x.n % x.d; return w ? `${w} ${r}/${x.d}` : `${x.n}/${x.d}`; }
function mixedHTML(w, n, d){ return w ? frHTML({n, d}, w) : frHTML({n, d}); }
function decStr(n, places){ // 정수 n 을 10^places 로 나눈 소수 문자열 (끝의 0 제거)
  const neg = n < 0; n = Math.abs(n); let s = String(n).padStart(places+1, '0');
  let out = places ? s.slice(0, s.length-places) + '.' + s.slice(s.length-places) : s;
  if (places) out = out.replace(/0+$/,'').replace(/\.$/,'');
  return (neg?'-':'') + out;
}

/* ---------- 문제 만들기 (정답은 모두 정수·분수로 정확히 계산) ---------- */
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = arr => arr[rnd(0, arr.length-1)];
const comma = n => n.toLocaleString('en-US');
const josa = n => [2,4,5,9].includes(n % 10) ? '와' : '과';   // 12와, 18과 (0으로 끝나면 십·백·천 → 과)
function properFrac(dMin, dMax){ const d = rnd(dMin, dMax); let n = rnd(1, d-1); while (gcd(n,d) !== 1) n = rnd(1, d-1); return {n, d}; }
const GEN = {
  'mul-table'(){ const a = rnd(2,9), b = rnd(2,9); return {html:`${a} × ${b}`, ans:F(a*b), kind:'int'}; },
  'div-table'(){ const b = rnd(2,9), q = rnd(2,9); return {html:`${b*q} ÷ ${b}`, ans:F(q), kind:'int'}; },
  'g4-round'(){ const a = rnd(2,9)*pick([10,100]), b = rnd(2,9)*pick([10,100]); return {html:`${comma(a)} × ${comma(b)}`, ans:F(a*b), kind:'int'}; },
  'g4-addsub'(){ let a = rnd(1000, 59999), b = rnd(1000, 39999);
    if (Math.random() < .5) return {html:`${comma(a)} + ${comma(b)}`, ans:F(a+b), kind:'int'};
    if (a < b) [a,b] = [b,a]; if (a === b) a += rnd(100, 999); return {html:`${comma(a)} − ${comma(b)}`, ans:F(a-b), kind:'int'}; },
  'g4-mul'(){ const a = rnd(101, 989), b = rnd(12, 98); return {html:`${a} × ${b}`, ans:F(a*b), kind:'int'}; },
  'g4-div'(){ const b = rnd(12, 79), q = rnd(Math.max(2, Math.ceil(100/b)), Math.floor(999/b)); return {html:`${b*q} ÷ ${b}`, ans:F(q), kind:'int'}; },
  'g5-mixed'(){ const k = rnd(0,3);
    if (k===0){ const a=rnd(10,50), b=rnd(2,9), c=rnd(2,9), d=rnd(1,Math.min(20, a+b*c-1)); return {html:`${a} + ${b} × ${c} − ${d}`, ans:F(a+b*c-d), kind:'int'}; }
    if (k===1){ const c=rnd(2,9), q=rnd(2,12), b=rnd(1,20), d=rnd(1,20); return {html:`(${c*q+b} − ${b}) ÷ ${c} + ${d}`, ans:F(q+d), kind:'int'}; }
    if (k===2){ const d=rnd(2,9), kk=rnd(2,9), s=rnd(3,15), b=rnd(1,s-1); return {html:`${kk*d} × (${b} + ${s-b}) ÷ ${d}`, ans:F(kk*s), kind:'int'}; }
    const c=rnd(2,9), q=rnd(2,9), d=rnd(2,5), a=q*d+rnd(1,40); return {html:`${a} − ${c*q} ÷ ${c} × ${d}`, ans:F(a-q*d), kind:'int'}; },
  'g5-gcd'(){ const g = rnd(2,12); let m = rnd(2,9), n = rnd(2,9); while (m === n || gcd(m,n) !== 1) { m = rnd(2,9); n = rnd(2,9); }
    const a = g*m, b = g*n, isG = Math.random() < .5;
    return {html:`${a}${josa(a)} ${b}의 ${isG?'최대공약수':'최소공배수'}`, ans:F(isG ? g : g*m*n), kind:'int', small:true}; },
  'g5-fracadd'(){ let x = properFrac(2,10), y = properFrac(2,10); while (x.d === y.d) y = properFrac(2,10);
    let w1 = Math.random()<.4 ? rnd(1,3) : 0, w2 = w1 && Math.random()<.6 ? rnd(0,w1) : 0;
    let X = F(w1*x.d + x.n, x.d), Y = F(w2*y.d + y.n, y.d), plus = Math.random() < .5;
    if (!plus && X.n*Y.d <= Y.n*X.d) { [x,y] = [y,x]; [w1,w2] = [w2,w1]; [X,Y] = [Y,X]; }
    if (!plus && X.n*Y.d === Y.n*X.d) plus = true;
    return {html:`${mixedHTML(w1,x.n,x.d)} ${plus?'+':'−'} ${mixedHTML(w2,y.n,y.d)}`, ans: plus ? add(X,Y) : sub(X,Y), kind:'frac'}; },
  'g5-fracmul'(){ const k = rnd(0,2), x = properFrac(2,10);
    if (k===0){ const y = properFrac(2,10); return {html:`${frHTML(x)} × ${frHTML(y)}`, ans:mul(x,y), kind:'frac'}; }
    if (k===1){ const w = rnd(2,12); return {html:`${w} × ${frHTML(x)}`, ans:mul(F(w),x), kind:'frac'}; }
    const w = rnd(1,3), y = properFrac(2,9), z = rnd(2,6); return {html:`${mixedHTML(w,y.n,y.d)} × ${z}`, ans:mul(F(w*y.d+y.n,y.d),F(z)), kind:'frac'}; },
  'g5-decmul'(){ const k = rnd(0,3); let A, pa, B, pb;
    if (k===0){ A=rnd(11,99); pa=1; B=rnd(2,9); pb=0; }
    else if (k===1){ A=rnd(11,99); pa=1; B=rnd(2,9); pb=1; }
    else if (k===2){ A=rnd(12,99); pa=0; B=rnd(1,9); pb=1; }
    else { A=rnd(11,99); pa=2; B=rnd(2,9); pb=0; }
    if (A % 10 === 0) A++;
    const p = pa + pb, prod = A*B;
    return {html:`${decStr(A,pa)} × ${decStr(B,pb)}`, ans:F(prod, 10**p), kind:'dec'}; },
  'g6-fracdiv'(){ const k = rnd(0,2), x = properFrac(2,10);
    if (k===0){ const y = properFrac(2,10); return {html:`${frHTML(x)} ÷ ${frHTML(y)}`, ans:div(x,y), kind:'frac'}; }
    if (k===1){ const w = rnd(2,9); return {html:`${w} ÷ ${frHTML(x)}`, ans:div(F(w),x), kind:'frac'}; }
    const w = rnd(2,9); return {html:`${frHTML(x)} ÷ ${w}`, ans:div(x,F(w)), kind:'frac'}; },
  'g6-decdiv'(){ if (Math.random() < .4){ const b = rnd(2,9), q = rnd(11,99); return {html:`${decStr(b*q,1)} ÷ ${b}`, ans:F(q,10), kind:'dec'}; }
    let X = rnd(2,49); if (X % 10 === 0) X++; const Q = Math.random()<.5 ? rnd(2,20)*10 : rnd(11,99);
    return {html:`${decStr(X*Q,2)} ÷ ${decStr(X,1)}`, ans:F(Q,10), kind:'dec'}; },
  'g6-percent'(){ for(;;){ const base = pick([20,40,50,60,80,120,150,200,240,300,400,500]), p = pick([5,10,20,25,30,40,50,60,75]);
      if (base*p % 100) continue; const part = base*p/100;
      if (Math.random() < .6) return {html:`${base}의 ${p}%`, ans:F(part), kind:'int'};
      return {html:`${part}은(는) ${base}의 몇 %?`, ans:F(p), kind:'int', small:true, unit:'%'}; } },
  'g6-ratio'(){ let a = rnd(2,9), b = rnd(2,9); while (a === b || gcd(a,b) !== 1) { a = rnd(2,9); b = rnd(2,9); } const k = rnd(2,9), B = '<span class="box"></span>';
    const pos = rnd(0,3), v = [a, b, a*k, b*k], ans = v[pos]; const t = v.map((x,i) => i === pos ? B : x);
    return {html:`${t[0]} : ${t[1]} = ${t[2]} : ${t[3]}`, ans:F(ans), kind:'int'}; },
};
function makeSet(skillId){
  const sk = skillById[skillId], seen = new Set(), out = [];
  for (let tries = 0; out.length < sk.n && tries < 500; tries++) { const p = GEN[skillId](); if (seen.has(p.html)) continue; seen.add(p.html); out.push(p); }
  return out;
}

/* ---------- 답 읽기 ---------- */
function readAnswer(text, p){
  let s = String(text).trim().replace(/\s+/g, ' ');
  if (p.unit) s = s.replace(/\s*(%|퍼센트)$/, '');
  if (!s) return {err:'답을 입력해 주세요.'};
  if (s.includes(',')) { if (!/^\d{1,3}(,\d{3})+$/.test(s)) return {err:'쉼표는 세 자리마다 찍어요. 쉼표 없이 써도 돼요.'}; s = s.replace(/,/g, ''); }
  let m = s.match(/^(\d+)\s*(?:와|과|\s)\s*(\d+)\s*\/\s*(\d+)$/);
  if (m) { const w=+m[1], n=+m[2], d=+m[3]; if (!d || n >= d) return {err:'대분수는 "1 3/4"처럼 써요.'}; return {v:F(w*d+n, d), frac:true, reduced: gcd(n,d) === 1}; }
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (m) { const n=+m[1], d=+m[2]; if (!d) return {err:'분모는 0이 될 수 없어요.'}; return {v:F(n,d), frac:true, reduced: gcd(n,d) === 1}; }
  if (/^\d+(\.\d+)?$/.test(s)) { const [i, f=''] = s.split('.'); return {v:F(+(i+f), 10**f.length), frac:false, reduced:true}; }
  return {err: p.kind === 'frac' ? '분수는 3/4, 대분수는 1 3/4 처럼 써요.' : '숫자로 써 주세요.'};
}
function judge(r, p){ // {ok, why}
  const same = r.v.n === p.ans.n && r.v.d === p.ans.d;
  if (!same) return {ok:false, why:'계산'};
  if (p.kind === 'frac' && p.ans.d !== 1 && !r.frac) return {ok:false, why:'분수로'};
  if (r.frac && !r.reduced) return {ok:false, why:'약분 안 함'};
  return {ok:true};
}


window.ARITH = { GEN, makeSet, readAnswer, judge, F, showFrac, textFrac, frHTML };
})();

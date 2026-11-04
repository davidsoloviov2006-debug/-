/* КБЖУ — личный дневник питания. Всё хранится на устройстве. */
(() => {
'use strict';

// ---------- утилиты ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = (x) => Math.round(+x || 0);
const r1 = (x) => Math.round((+x || 0) * 10) / 10;
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pad = (n) => String(n).padStart(2, '0');
const dk = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDk = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDk(s); d.setDate(d.getDate() + n); return dk(d); };
const NK = ['kcal', 'p', 'f', 'c', 'fib', 'sug', 'sat', 'na'];
const zeroN = () => Object.fromEntries(NK.map((k) => [k, 0]));
const scaleN = (n, g) => Object.fromEntries(NK.map((k) => [k, (+n?.[k] || 0) * g / 100]));
const addN = (a, b) => { NK.forEach((k) => (a[k] += +b[k] || 0)); return a; };

// ---------- состояние ----------
const KEY = 'kbju.v1';
const defaults = () => ({
  v: 1,
  settings: { lang: null, theme: 'auto', glass: 250, countExercise: true, scFood: 'KBJU Food', scWeight: 'KBJU Weight', scImport: 'KBJU Import' },
  profile: { sex: 'm', age: 30, height: 175, weight: 75, activity: 1.375, goal: 'lose', pace: 0.5, target: 70 },
  goals: { kcal: 2000, pPct: 30, fPct: 30, cPct: 40, water: 2000, fib: 28 },
  days: {}, weights: {}, foods: {}, recipes: {}, recents: [], favorites: [],
  fast: { start: null, hours: 16, history: [] },
});
let S;
try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = defaults(); }
S.settings = Object.assign(defaults().settings, S.settings);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast(t('storageFull')); } };

// ---------- язык ----------
const LANGS = { ru: 'Русский', he: 'עברית', en: 'English' };
const detectLang = () => { const l = (navigator.language || 'ru').slice(0, 2); return l === 'he' || l === 'iw' ? 'he' : l === 'en' ? 'en' : 'ru'; };
let L = S.settings.lang || detectLang();
const t = (k, vars) => { let s = (window.I18N[L] && window.I18N[L][k]) ?? window.I18N.ru[k] ?? k; if (vars) for (const v in vars) s = s.split(`{${v}}`).join(vars[v]); return s; };
const LI = { ru: 0, he: 1, en: 2 };
function applyLang() {
  document.documentElement.lang = L;
  document.documentElement.dir = L === 'he' ? 'rtl' : 'ltr';
}
const fmtDate = (s, opts) => new Intl.DateTimeFormat(L === 'he' ? 'he-IL' : L, opts).format(parseDk(s));

// ---------- тема ----------
function applyTheme() {
  const th = S.settings.theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
  const dark = th === 'dark' || (th === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name=theme-color]')?.setAttribute('content', dark ? '#0e1215' : '#eef2ef');
}

// ---------- иконки ----------
const IC = {
  diary: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  barcode: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-9-1 2-2 3-3 3 0-2-1-4-3-6 0 4-4 7-4 12 0 4.3 3 7 7 7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart: '<path d="M12 20s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.3-8 11-8 11z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  flash: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2v5M6 12l3-4 4 1 3 3 3 1M11 15l-1-5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  moon: '<path d="M20 15A8 8 0 1 1 9 4a6.5 6.5 0 0 0 11 11z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/>',
  chef: '<path d="M6 14a4 4 0 1 1 2-7.5 4 4 0 0 1 8 0A4 4 0 1 1 18 14v6H6z"/><path d="M6 17h12"/>',
  note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
  moonm: '<path d="M20 15A8 8 0 1 1 9 4a6.5 6.5 0 0 0 11 11z"/>',
  apple: '<path d="M12 7c-2-2-7-1.5-7 4 0 4 3 9 5 9 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-5 5-9 0-5.5-5-6-7-4z"/><path d="M12 7c0-2 1-4 3-4"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 8"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_IC = { breakfast: 'coffee', lunch: 'bowl', dinner: 'moonm', snack: 'apple' };
const defaultMeal = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; };

// ---------- цели ----------
function goalG() {
  const g = S.goals;
  return { kcal: g.kcal, p: g.kcal * g.pPct / 100 / 4, f: g.kcal * g.fPct / 100 / 9, c: g.kcal * g.cPct / 100 / 4, fib: g.fib, water: g.water };
}
function calcGoal(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * p.activity;
  const delta = p.goal === 'keep' ? 0 : (p.pace * 7700) / 7 * (p.goal === 'lose' ? -1 : 1);
  const kcal = Math.max(p.sex === 'm' ? 1500 : 1200, Math.round((tdee + delta) / 10) * 10);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal };
}

// ---------- продукты ----------
function localFood(i) {
  const a = window.LOCAL_FOODS[i];
  const names = [a[0], a[1], a[2]];
  return { key: 'L:' + i, name: names[LI[L]] || a[0], alt: names, brand: '', n: { kcal: a[3], p: a[4], f: a[5], c: a[6], fib: a[7], sug: 0, sat: 0, na: 0 }, servings: a[8] ? [{ name: t('srv.' + a[8]), g: a[9] }] : [], src: 'local' };
}
function getFood(key) {
  if (!key) return null;
  const [type, id] = [key.slice(0, 1), key.slice(2)];
  if (type === 'L') return window.LOCAL_FOODS[+id] ? localFood(+id) : null;
  if (type === 'F') { const f = S.foods[id]; return f ? { ...f, key } : null; }
  if (type === 'R') { const r = S.recipes[id]; return r ? recipeFood(r) : null; }
  return null;
}
function recipeFood(r) {
  const tot = zeroN(); let g = 0;
  r.items.forEach((it) => { addN(tot, scaleN(it.n, it.grams)); g += +it.grams || 0; });
  const W = +r.cooked || g || 1;
  return { key: 'R:' + r.id, name: r.name, brand: t('recipe'), n: scaleN(tot, 10000 / W), servings: [{ name: t('srv.portion'), g: Math.round(W / (r.servings || 1)) }], src: 'recipe', totalW: W, total: tot };
}
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[״"'׳`.,()\-]/g, ' ').replace(/\s+/g, ' ').trim();
function searchLocal(q) {
  const nq = norm(q); if (!nq) return [];
  const words = nq.split(' ');
  const out = [];
  const score = (hay) => { const h = norm(hay); if (!words.every((w) => h.includes(w))) return -1; return (h.startsWith(nq) ? 3 : 0) + (h.includes(nq) ? 2 : 0) - h.length / 100; };
  Object.values(S.foods).forEach((f) => { const s = score(f.name + ' ' + (f.brand || '') + ' ' + (f.barcode || '')); if (s >= 0) out.push([s + 5, getFood('F:' + f.id)]); });
  Object.values(S.recipes).forEach((r) => { const s = score(r.name); if (s >= 0) out.push([s + 5, recipeFood(r)]); });
  window.LOCAL_FOODS.forEach((a, i) => { const s = Math.max(score(a[0]), score(a[1]), score(a[2])); if (s >= 0) out.push([s, localFood(i)]); });
  return out.sort((a, b) => b[0] - a[0]).slice(0, 40).map((x) => x[1]);
}
const touchRecent = (key) => { S.recents = [key, ...S.recents.filter((k) => k !== key)].slice(0, 40); };
const isFav = (key) => S.favorites.includes(key);

// ---------- Open Food Facts ----------
const OFF_FIELDS = 'code,product_name,product_name_he,product_name_ru,product_name_en,generic_name,brands,nutriments,serving_quantity,serving_size,image_front_small_url,quantity';
function offToFood(p) {
  const nm = p.nutriments || {};
  let kcal = nm['energy-kcal_100g'];
  if (kcal == null && nm['energy_100g'] != null) kcal = nm['energy_100g'] / 4.184;
  const name = p['product_name_' + L] || p.product_name_he || p.product_name_ru || p.product_name_en || p.product_name || p.generic_name || '';
  const na = nm['sodium_100g'] != null ? nm['sodium_100g'] * 1000 : nm['salt_100g'] != null ? nm['salt_100g'] / 2.5 * 1000 : 0;
  const has = kcal != null || nm['proteins_100g'] != null;
  const f = {
    id: 'off' + p.code, barcode: p.code, name: name || p.code, brand: (p.brands || '').split(',')[0].trim(),
    n: { kcal: +kcal || 0, p: +nm['proteins_100g'] || 0, f: +nm['fat_100g'] || 0, c: +nm['carbohydrates_100g'] || 0, fib: +nm['fiber_100g'] || 0, sug: +nm['sugars_100g'] || 0, sat: +nm['saturated-fat_100g'] || 0, na: +na || 0 },
    servings: +p.serving_quantity > 0 ? [{ name: p.serving_size || t('srv.portion'), g: +p.serving_quantity }] : [],
    img: p.image_front_small_url || '', src: 'off',
  };
  if (!f.n.kcal && (f.n.p || f.n.f || f.n.c)) f.n.kcal = f.n.p * 4 + f.n.f * 9 + f.n.c * 4;
  return { food: f, has };
}
async function offProduct(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?lc=${L}&fields=${OFF_FIELDS}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('net');
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  return offToFood({ ...j.product, code: j.product.code || code });
}
let offCtl;
async function offSearch(q) {
  offCtl?.abort(); offCtl = new AbortController();
  const tag = L === 'he' || /[֐-׿]/.test(q) ? '&tagtype_0=countries&tag_contains_0=contains&tag_0=israel' : '';
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&lc=${L}&fields=${OFF_FIELDS}${tag}`;
  const sig = offCtl.signal;
  const ok = (arr) => arr.map((p) => offToFood({ ...p, brands: Array.isArray(p.brands) ? p.brands.join(',') : p.brands })).filter((x) => x.has && x.food.name).map((x) => x.food);
  // классический поиск OFF; иногда отвечает 502 — пробуем ещё раз
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(url, { signal: sig }); if (r.ok) { const j = await r.json(); return ok(j.products || []); } }
    catch (e) { if (e.name === 'AbortError') throw e; }
    await new Promise((res) => setTimeout(res, 600));
  }
  throw new Error('net');
}
function cacheOff(f) { S.foods[f.id] = f; save(); return 'F:' + f.id; }
const findByBarcode = (code) => Object.values(S.foods).find((f) => f.barcode === code);

// ---------- дни ----------
const day = (d) => (S.days[d] ||= { entries: [], water: 0, note: '', ex: [] });
const peekDay = (d) => S.days[d] || { entries: [], water: 0, note: '', ex: [] };
const entryN = (e) => scaleN(e.n, e.grams);
const entryName = (e) => (e.ref?.startsWith('L:') && getFood(e.ref)?.name) || e.name; // встроенные продукты — на текущем языке
function dayTotals(d) { const x = zeroN(); peekDay(d).entries.forEach((e) => addN(x, entryN(e))); return x; }
const burned = (d) => (peekDay(d).ex || []).reduce((s, e) => s + (+e.kcal || 0), 0);

// ---------- UI-каркас ----------
let tab = 'diary';
let cur = dk();
let reportDays = 7;
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast glass'; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2200); setTimeout(() => el.remove(), 2700);
}
const haptic = (ms = 12) => { try { navigator.vibrate?.(ms); } catch {} };

// шторки
const sheets = [];
function openSheet(html, { onMount, onClose, full = false, cls = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet glass ${full ? 'full' : ''} ${cls}" role="dialog"><div class="grab"></div><div class="sheet-body">${html}</div></div>`;
  $('#sheets').appendChild(wrap);
  const sh = { el: wrap, onClose };
  sheets.push(sh);
  requestAnimationFrame(() => wrap.classList.add('open'));
  wrap.querySelector('.sheet-bg').addEventListener('click', () => closeSheet());
  dragToClose(wrap.querySelector('.sheet'));
  onMount?.(wrap.querySelector('.sheet-body'), sh);
  return sh;
}
function closeSheet(sh) {
  sh = sh || sheets[sheets.length - 1]; if (!sh) return;
  const i = sheets.indexOf(sh); if (i >= 0) sheets.splice(i, 1);
  sh.onClose?.();
  sh.el.classList.remove('open');
  setTimeout(() => sh.el.remove(), 320);
}
const closeAll = () => [...sheets].reverse().forEach((s) => closeSheet(s));
function dragToClose(sheet) {
  const grab = sheet.querySelector('.grab'); let y0 = null, dy = 0;
  const start = (e) => { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; };
  const move = (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 == null) return; sheet.style.transition = ''; sheet.style.transform = ''; if (dy > 110) closeSheet(sheets.find((s) => s.el.contains(sheet))); y0 = null; };
  grab.addEventListener('touchstart', start, { passive: true });
  grab.addEventListener('touchmove', move, { passive: true });
  grab.addEventListener('touchend', end);
}
function confirmBox(msg, okText, fn) {
  openSheet(`<p class="confirm-msg">${esc(msg)}</p><div class="row gap"><button class="btn ghost grow" data-close>${t('cancel')}</button><button class="btn danger grow" data-ok>${esc(okText)}</button></div>`, {
    onMount: (b, sh) => { b.querySelector('[data-close]').onclick = () => closeSheet(sh); b.querySelector('[data-ok]').onclick = () => { closeSheet(sh); fn(); }; },
  });
}

// ---------- рендер ----------
function render() {
  applyLang();
  $$('.nav-btn').forEach((b) => { b.classList.toggle('active', b.dataset.tab === tab); b.querySelector('span').textContent = t('tab.' + b.dataset.tab); });
  $('#fab').setAttribute('aria-label', t('addFood'));
  const v = $('#view');
  v.innerHTML = ({ diary: viewDiary, reports: viewReports, progress: viewProgress, profile: viewProfile })[tab]();
  bindView(v);
}

function ring(val, max, size = 168, stroke = 14, color = 'var(--accent)', over = false) {
  const R = (size - stroke) / 2, C = 2 * Math.PI * R, p = max > 0 ? clamp(val / max, 0, 1) : 0;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring"><circle cx="${size / 2}" cy="${size / 2}" r="${R}" stroke="var(--track)" stroke-width="${stroke}" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${R}" stroke="${over ? 'var(--danger)' : color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-arc"/></svg>`;
}
function macroBar(label, val, goal, cls) {
  const p = goal > 0 ? clamp(val / goal * 100, 0, 100) : 0;
  return `<div class="mbar ${cls}"><div class="mbar-top"><span>${label}</span><b>${r0(val)}<small>/${r0(goal)} ${t('g')}</small></b></div><div class="track"><i style="width:${p}%"></i></div></div>`;
}
function dateTitle(d) {
  const today = dk();
  if (d === today) return t('today');
  if (d === addDays(today, -1)) return t('yesterday');
  if (d === addDays(today, 1)) return t('tomorrow');
  return fmtDate(d, { weekday: 'short', day: 'numeric', month: 'long' });
}

function viewDiary() {
  const D = peekDay(cur), T = dayTotals(cur), G = goalG(), b = S.settings.countExercise ? burned(cur) : 0;
  const budget = G.kcal + b, left = budget - T.kcal;
  const meals = MEALS.map((m) => {
    const list = D.entries.filter((e) => e.meal === m);
    const sum = list.reduce((s, e) => s + entryN(e).kcal, 0);
    const prev = peekDay(addDays(cur, -1)).entries.filter((e) => e.meal === m).length;
    return `<section class="card glass meal">
      <header class="meal-h"><div class="meal-ic">${icon(MEAL_IC[m])}</div><div class="grow"><h3>${t('meal.' + m)}</h3><small>${list.length ? `${r0(sum)} ${t('kcal')}` : t('empty')}</small></div>
        ${!list.length && prev ? `<button class="icon-btn" data-act="copyMeal" data-meal="${m}" title="${t('copyYesterday')}">${icon('copy')}</button>` : ''}
        <button class="icon-btn accent" data-act="add" data-meal="${m}" aria-label="${t('addFood')}">${icon('plus')}</button></header>
      ${list.map((e) => { const n = entryN(e); return `<button class="entry" data-act="editEntry" data-id="${e.id}"><div class="grow"><div class="e-name">${esc(entryName(e))}</div><div class="e-sub">${e.quick ? t('quickAdd') : `${r0(e.grams)} ${t('g')}`} · ${t('p1')} ${r1(n.p)} · ${t('f1')} ${r1(n.f)} · ${t('c1')} ${r1(n.c)}</div></div><div class="e-kcal">${r0(n.kcal)}</div></button>`; }).join('')}
    </section>`;
  }).join('');
  const glasses = Math.max(8, Math.ceil(G.water / S.settings.glass));
  const filled = Math.floor(D.water / S.settings.glass);
  const ex = D.ex || [];
  return `
  <header class="topbar">
    <button class="icon-btn" data-act="day" data-d="-1" aria-label="prev">${icon('left', 'flip')}</button>
    <label class="date-pick"><span>${esc(dateTitle(cur))}</span><input type="date" value="${cur}" data-act-change="pickDate"></label>
    <button class="icon-btn" data-act="day" data-d="1" aria-label="next">${icon('right', 'flip')}</button>
  </header>
  <section class="card glass summary">
    <div class="sum-side"><small>${t('eaten')}</small><b>${r0(T.kcal)}</b></div>
    <div class="ring-wrap">${ring(T.kcal, budget, 168, 14, 'var(--accent)', left < 0)}<div class="ring-c"><b>${r0(Math.abs(left))}</b><small>${left >= 0 ? t('left') : t('over')}</small></div></div>
    <div class="sum-side"><small>${t('burned')}</small><b>${r0(burned(cur))}</b></div>
    <div class="macros">${macroBar(t('protein'), T.p, G.p, 'p')}${macroBar(t('fat'), T.f, G.f, 'f')}${macroBar(t('carbs'), T.c, G.c, 'c')}</div>
    <div class="mini-stats"><span>${t('fiber')} <b>${r1(T.fib)}</b>/${G.fib} ${t('g')}</span><span>${t('goal')} <b>${G.kcal}</b> ${t('kcal')}</span></div>
  </section>
  ${meals}
  <section class="card glass">
    <header class="meal-h"><div class="meal-ic ex">${icon('run')}</div><div class="grow"><h3>${t('activity')}</h3><small>${ex.length ? `−${r0(burned(cur))} ${t('kcal')}` : t('activityHint')}</small></div><button class="icon-btn accent" data-act="addEx">${icon('plus')}</button></header>
    ${ex.map((e) => `<button class="entry" data-act="delEx" data-id="${e.id}"><div class="grow"><div class="e-name">${esc(e.name)}</div><div class="e-sub">${e.min ? `${e.min} ${t('min')}` : ''}</div></div><div class="e-kcal burn">−${r0(e.kcal)}</div></button>`).join('')}
  </section>
  <section class="card glass water">
    <header class="meal-h"><div class="meal-ic w">${icon('drop')}</div><div class="grow"><h3>${t('water')}</h3><small>${D.water} / ${G.water} ${t('ml')}</small></div>
    <button class="icon-btn" data-act="water" data-d="-1">${icon('minus')}</button><button class="icon-btn accent" data-act="water" data-d="1">${icon('plus')}</button></header>
    <div class="glasses">${Array.from({ length: glasses }, (_, i) => `<button class="gl ${i < filled ? 'on' : ''}" data-act="waterSet" data-n="${i + 1}" aria-label="${i + 1}">${icon('drop')}</button>`).join('')}</div>
  </section>
  <section class="card glass">
    <header class="meal-h"><div class="meal-ic">${icon('note')}</div><div class="grow"><h3>${t('note')}</h3></div></header>
    <textarea class="input note" rows="2" placeholder="${t('notePh')}" data-act-input="note">${esc(D.note || '')}</textarea>
  </section>
  <button class="btn glass health-btn" data-act="healthDay">${icon('heart')} ${t('sendHealth')}</button>
  <div class="spacer"></div>`;
}

// ---------- отчёты ----------
function viewReports() {
  const G = goalG(); const days = []; for (let i = reportDays - 1; i >= 0; i--) days.push(addDays(dk(), -i));
  const data = days.map((d) => ({ d, T: dayTotals(d), n: peekDay(d).entries.length }));
  const logged = data.filter((x) => x.n);
  const avg = zeroN(); logged.forEach((x) => addN(avg, x.T)); if (logged.length) NK.forEach((k) => (avg[k] /= logged.length));
  const inRange = logged.filter((x) => Math.abs(x.T.kcal - G.kcal) <= G.kcal * 0.1).length;
  const max = Math.max(G.kcal * 1.25, ...data.map((x) => x.T.kcal));
  const W = 340, H = 170, bw = W / data.length;
  const gy = H - (G.kcal / max) * H;
  const bars = data.map((x, i) => { const h = (x.T.kcal / max) * H; const over = x.T.kcal > G.kcal * 1.1; return `<rect x="${i * bw + bw * 0.18}" y="${H - h}" width="${bw * 0.64}" height="${Math.max(h, x.n ? 2 : 0)}" rx="${Math.min(6, bw * 0.3)}" class="${over ? 'bar over' : 'bar'}"><title>${fmtDate(x.d, { day: 'numeric', month: 'short' })}: ${r0(x.T.kcal)}</title></rect>`; }).join('');
  const labels = data.map((x, i) => (reportDays <= 7 || i % 5 === 0) ? `<text x="${i * bw + bw / 2}" y="${H + 16}" text-anchor="middle">${reportDays <= 7 ? fmtDate(x.d, { weekday: 'narrow' }) : parseDk(x.d).getDate()}</text>` : '').join('');
  // донат макросов
  const pk = avg.p * 4, fk = avg.f * 9, ck = avg.c * 4, tot = pk + fk + ck || 1;
  const seg = [[pk, 'var(--p)'], [fk, 'var(--f)'], [ck, 'var(--c)']];
  let off = 0; const R = 46, C = 2 * Math.PI * R;
  const donut = seg.map(([v, col]) => { const len = v / tot * C; const s = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${col}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += len; return s; }).join('');
  // топ продуктов
  const top = {}; days.forEach((d) => peekDay(d).entries.forEach((e) => { const k = e.name; top[k] = (top[k] || 0) + entryN(e).kcal; }));
  const topL = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `
  <header class="topbar"><h1>${t('tab.reports')}</h1></header>
  <div class="seg glass">${[7, 30, 90].map((n) => `<button class="${reportDays === n ? 'on' : ''}" data-act="rdays" data-n="${n}">${t('days' + n)}</button>`).join('')}</div>
  <div class="kpis">
    <div class="kpi glass"><small>${t('avgKcal')}</small><b>${r0(avg.kcal)}</b><span>${t('goal')} ${G.kcal}</span></div>
    <div class="kpi glass"><small>${t('inRange')}</small><b>${inRange}/${logged.length}</b><span>±10%</span></div>
  </div>
  <section class="card glass"><h3>${t('kcalByDay')}</h3>
    <svg viewBox="0 -6 ${W} ${H + 24}" class="chart">${bars}<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" class="goal-line"/>${labels}</svg>
  </section>
  <section class="card glass"><h3>${t('macroSplit')}</h3>
    <div class="donut-row"><svg viewBox="0 0 120 120" class="donut"><circle r="${R}" cx="60" cy="60" fill="none" stroke="var(--track)" stroke-width="16"/>${logged.length ? donut : ''}</svg>
    <ul class="legend">
      <li><i class="dot p"></i>${t('protein')} <b>${r0(avg.p)} ${t('g')}</b> <span>${r0(pk / tot * 100)}% / ${S.goals.pPct}%</span></li>
      <li><i class="dot f"></i>${t('fat')} <b>${r0(avg.f)} ${t('g')}</b> <span>${r0(fk / tot * 100)}% / ${S.goals.fPct}%</span></li>
      <li><i class="dot c"></i>${t('carbs')} <b>${r0(avg.c)} ${t('g')}</b> <span>${r0(ck / tot * 100)}% / ${S.goals.cPct}%</span></li>
      <li><i class="dot fib"></i>${t('fiber')} <b>${r1(avg.fib)} ${t('g')}</b></li>
    </ul></div>
  </section>
  <section class="card glass"><h3>${t('topFoods')}</h3>
    ${topL.length ? topL.map(([n, k]) => `<div class="li"><span class="grow">${esc(n)}</span><b>${r0(k)}</b>&nbsp;<small>${t('kcal')}</small></div>`).join('') : `<p class="muted">${t('noData')}</p>`}
  </section>
  <button class="btn glass" data-act="csv">${icon('download')} ${t('exportCsv')}</button>
  <div class="spacer"></div>`;
}

// ---------- прогресс: вес и голодание ----------
function weightList() { return Object.entries(S.weights).sort((a, b) => a[0].localeCompare(b[0])); }
function forecast() {
  const w = weightList().filter(([d]) => d >= addDays(dk(), -30));
  if (w.length < 3) return null;
  const xs = w.map(([d]) => (parseDk(d) - parseDk(w[0][0])) / 864e5), ys = w.map((x) => x[1]);
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const k = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1);
  const last = ys[n - 1], tgt = S.profile.target;
  if (!tgt || Math.abs(k) < 0.005 || Math.sign(tgt - last) !== Math.sign(k)) return { k };
  return { k, days: Math.round((tgt - last) / k) };
}
function viewProgress() {
  const wl = weightList(); const last = wl.length ? wl[wl.length - 1][1] : S.profile.weight;
  const first = wl.length ? wl[0][1] : last;
  const fc = forecast();
  let chart = `<p class="muted">${t('noWeights')}</p>`;
  if (wl.length >= 2) {
    const pts = wl.slice(-60), W = 340, H = 140;
    const vals = pts.map((x) => x[1]).concat(S.profile.target ? [S.profile.target] : []);
    const mn = Math.min(...vals) - 0.5, mx = Math.max(...vals) + 0.5;
    const t0 = parseDk(pts[0][0]), span = Math.max(1, (parseDk(pts[pts.length - 1][0]) - t0) / 864e5);
    const X = (d) => ((parseDk(d) - t0) / 864e5 / span) * (W - 12) + 6, Y = (v) => H - ((v - mn) / (mx - mn)) * (H - 12) - 6;
    const path = pts.map(([d, v], i) => `${i ? 'L' : 'M'}${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    const area = path + `L${X(pts[pts.length - 1][0])},${H}L${X(pts[0][0])},${H}Z`;
    const ty = S.profile.target ? `<line x1="0" x2="${W}" y1="${Y(S.profile.target)}" y2="${Y(S.profile.target)}" class="goal-line"/>` : '';
    chart = `<svg viewBox="0 0 ${W} ${H}" class="chart wchart"><defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${ty}<path d="${area}" fill="url(#wg)"/><path d="${path}" class="wline"/>${pts.map(([d, v]) => `<circle cx="${X(d)}" cy="${Y(v)}" r="3" class="wdot"/>`).join('')}</svg>`;
  }
  const F = S.fast; const now = Date.now();
  const el = F.start ? (now - F.start) / 36e5 : 0;
  return `
  <header class="topbar"><h1>${t('tab.progress')}</h1></header>
  <section class="card glass">
    <div class="w-head"><div><small>${t('weightNow')}</small><b class="big">${r1(last)}<small> ${t('kg')}</small></b></div>
      <div class="w-stats"><span>${t('change')} <b class="${last - first <= 0 ? 'good' : ''}">${last - first > 0 ? '+' : ''}${r1(last - first)}</b></span><span>${t('target')} <b>${S.profile.target || '—'}</b></span>
      ${fc && fc.days ? `<span>${t('forecast')} <b>${fmtDate(addDays(dk(), fc.days), { day: 'numeric', month: 'short', year: 'numeric' })}</b></span>` : fc ? `<span>${t('trend')} <b>${fc.k > 0 ? '+' : ''}${r1(fc.k * 7)} ${t('kgWeek')}</b></span>` : ''}</div></div>
    ${chart}
    <div class="row gap"><input class="input grow" id="wIn" inputmode="decimal" placeholder="${t('weightPh')}" value=""><button class="btn accent" data-act="addWeight">${icon('plus')} ${t('save')}</button></div>
    <div class="row gap mt"><button class="btn ghost grow sm" data-act="healthImport">${icon('heart')} ${t('importHealth')}</button></div>
    <details class="hist"><summary>${t('history')} (${wl.length})</summary>${wl.slice().reverse().slice(0, 60).map(([d, v]) => `<div class="li"><span class="grow">${fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' })}</span><b>${r1(v)} ${t('kg')}</b><button class="icon-btn sm" data-act="delWeight" data-d="${d}">${icon('trash')}</button></div>`).join('')}</details>
  </section>
  <section class="card glass fast">
    <h3>${icon('clock')} ${t('fasting')}</h3>
    <div class="fast-body"><div class="ring-wrap sm">${ring(el, F.hours, 150, 12, 'var(--c)')}<div class="ring-c"><b id="fastTime">${F.start ? fmtDur(now - F.start) : '0:00'}</b><small>${F.start ? (el >= F.hours ? t('fastDone') : t('fastLeft', { t: fmtDur(F.hours * 36e5 - (now - F.start)) })) : t('fastIdle')}</small></div></div>
    <div class="fast-side"><div class="chips">${[12, 14, 16, 18, 20].map((h) => `<button class="chip ${F.hours === h ? 'on' : ''}" data-act="fastH" data-h="${h}">${h}:${24 - h}</button>`).join('')}</div>
    <button class="btn ${F.start ? 'ghost' : 'accent'}" data-act="fastToggle">${F.start ? t('fastStop') : t('fastStart')}</button></div></div>
    ${F.history.length ? `<div class="fast-hist">${F.history.slice(-7).reverse().map((h) => `<div class="li"><span class="grow">${new Date(h.start).toLocaleDateString(L)}</span><b>${fmtDur(h.end - h.start)}</b></div>`).join('')}</div>` : ''}
  </section>
  <div class="spacer"></div>`;
}
const fmtDur = (ms) => { ms = Math.max(0, ms); const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4); return `${h}:${pad(m)}`; };

// ---------- профиль ----------
function viewProfile() {
  const p = S.profile, g = S.goals, G = goalG(), calc = calcGoal(p);
  const sel = (id, opts, v) => `<select class="input" id="${id}">${opts.map(([val, lab]) => `<option value="${val}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  const appUrl = location.origin + location.pathname;
  return `
  <header class="topbar"><h1>${t('tab.profile')}</h1></header>
  <section class="card glass">
    <h3>${icon('flame')} ${t('goals')}</h3>
    <div class="grid2">
      <label class="fld"><span>${t('kcalGoal')}</span><input class="input" id="gK" inputmode="numeric" value="${g.kcal}"></label>
      <label class="fld"><span>${t('waterGoal')}</span><input class="input" id="gW" inputmode="numeric" value="${g.water}"></label>
      <label class="fld"><span>${t('protein')} %</span><input class="input" id="gP" inputmode="numeric" value="${g.pPct}"></label>
      <label class="fld"><span>${t('fat')} %</span><input class="input" id="gF" inputmode="numeric" value="${g.fPct}"></label>
      <label class="fld"><span>${t('carbs')} %</span><input class="input" id="gC" inputmode="numeric" value="${g.cPct}"></label>
      <label class="fld"><span>${t('fiber')}, ${t('g')}</span><input class="input" id="gFb" inputmode="numeric" value="${g.fib}"></label>
    </div>
    <p class="muted small">${t('protein')} ${r0(G.p)} ${t('g')} · ${t('fat')} ${r0(G.f)} ${t('g')} · ${t('carbs')} ${r0(G.c)} ${t('g')}</p>
    <button class="btn accent wide" data-act="saveGoals">${t('save')}</button>
  </section>
  <section class="card glass">
    <h3>${icon('user')} ${t('calculator')}</h3>
    <div class="grid2">
      <label class="fld"><span>${t('sex')}</span>${sel('pS', [['m', t('male')], ['f', t('female')]], p.sex)}</label>
      <label class="fld"><span>${t('age')}</span><input class="input" id="pA" inputmode="numeric" value="${p.age}"></label>
      <label class="fld"><span>${t('height')}</span><input class="input" id="pH" inputmode="numeric" value="${p.height}"></label>
      <label class="fld"><span>${t('weight')}</span><input class="input" id="pW" inputmode="decimal" value="${p.weight}"></label>
      <label class="fld span2"><span>${t('activityLvl')}</span>${sel('pAc', [[1.2, t('act1')], [1.375, t('act2')], [1.55, t('act3')], [1.725, t('act4')], [1.9, t('act5')]], p.activity)}</label>
      <label class="fld"><span>${t('goalType')}</span>${sel('pG', [['lose', t('lose')], ['keep', t('keep')], ['gain', t('gain')]], p.goal)}</label>
      <label class="fld"><span>${t('pace')}</span>${sel('pP', [[0.25, '0.25'], [0.5, '0.5'], [0.75, '0.75'], [1, '1.0']], p.pace)}</label>
      <label class="fld span2"><span>${t('targetW')}</span><input class="input" id="pT" inputmode="decimal" value="${p.target || ''}"></label>
    </div>
    <p class="muted small">${t('bmr')}: <b>${calc.bmr}</b> · ${t('tdee')}: <b>${calc.tdee}</b> · ${t('recommended')}: <b>${calc.kcal}</b> ${t('kcal')}</p>
    <button class="btn accent wide" data-act="applyCalc">${t('applyCalc')}</button>
  </section>
  <section class="card glass">
    <h3>${icon('globe')} ${t('settings')}</h3>
    <div class="set-row"><span>${t('language')}</span><div class="seg sm">${Object.entries(LANGS).map(([k, v]) => `<button class="${L === k ? 'on' : ''}" data-act="lang" data-l="${k}">${v}</button>`).join('')}</div></div>
    <div class="set-row"><span>${t('theme')}</span><div class="seg sm">${['auto', 'dark', 'light'].map((k) => `<button class="${S.settings.theme === k ? 'on' : ''}" data-act="theme" data-v="${k}">${t('theme.' + k)}</button>`).join('')}</div></div>
    <div class="set-row"><span>${t('glassSize')}</span><div class="seg sm">${[200, 250, 330].map((k) => `<button class="${S.settings.glass === k ? 'on' : ''}" data-act="glass" data-v="${k}">${k}</button>`).join('')}</div></div>
    <div class="set-row"><span>${t('countEx')}</span><button class="switch ${S.settings.countExercise ? 'on' : ''}" data-act="toggleEx" aria-label="toggle"><i></i></button></div>
  </section>
  <section class="card glass">
    <h3>${icon('heart')} ${t('health')}</h3>
    <p class="muted small">${t('healthIntro')}</p>
    <details class="howto"><summary>${t('healthSetup')}</summary>
      <ol>
        <li>${t('hs1', { n: `<b>${esc(S.settings.scFood)}</b>` })}</li>
        <li>${t('hs2')}</li>
        <li>${t('hs3')}</li>
        <li>${t('hs4', { n: `<b>${esc(S.settings.scWeight)}</b>` })}</li>
        <li>${t('hs5', { n: `<b>${esc(S.settings.scImport)}</b>`, u: `<code>${esc(appUrl)}#w=</code>` })}</li>
      </ol>
    </details>
    <div class="grid2">
      <label class="fld"><span>${t('scFood')}</span><input class="input" id="scF" value="${esc(S.settings.scFood)}"></label>
      <label class="fld"><span>${t('scWeight')}</span><input class="input" id="scW" value="${esc(S.settings.scWeight)}"></label>
      <label class="fld span2"><span>${t('scImport')}</span><input class="input" id="scI" value="${esc(S.settings.scImport)}"></label>
    </div>
    <button class="btn ghost wide" data-act="saveSc">${t('save')}</button>
  </section>
  <section class="card glass">
    <h3>${icon('phone')} ${t('install')}</h3>
    <ol class="steps"><li>${t('in1')}</li><li>${t('in2', { i: icon('share', 'inl') })}</li><li>${t('in3')}</li></ol>
  </section>
  <section class="card glass">
    <h3>${icon('book')} ${t('myData')}</h3>
    <div class="li"><span class="grow">${t('myFoods')}</span><b>${Object.values(S.foods).filter((f) => f.src === 'custom').length}</b></div>
    <div class="li"><span class="grow">${t('recipes')}</span><b>${Object.keys(S.recipes).length}</b></div>
    <div class="li"><span class="grow">${t('loggedDays')}</span><b>${Object.values(S.days).filter((d) => d.entries.length).length}</b></div>
    <div class="row gap wrap mt">
      <button class="btn ghost grow sm" data-act="backup">${icon('download')} ${t('backup')}</button>
      <label class="btn ghost grow sm">${icon('upload')} ${t('restore')}<input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>
      <button class="btn ghost grow sm" data-act="csv">${icon('download')} CSV</button>
    </div>
    <button class="btn danger-ghost wide mt" data-act="wipe">${icon('trash')} ${t('wipe')}</button>
  </section>
  <p class="muted small center">${t('about')}</p>
  <div class="spacer"></div>`;
}

// ---------- обработчики ----------
const A = {}; // действия по data-act
function bindView(root) {
  $$('[data-act-change]', root).forEach((el) => el.addEventListener('change', (e) => A[el.dataset.actChange]?.(el, e)));
  $$('[data-act-input]', root).forEach((el) => el.addEventListener('input', (e) => A[el.dataset.actInput]?.(el, e)));
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = A[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});

A.tab = (el) => { tab = el.dataset.tab; closeAll(); render(); window.scrollTo({ top: 0 }); };
A.day = (el) => { cur = addDays(cur, +el.dataset.d); render(); };
A.pickDate = (el) => { if (el.value) { cur = el.value; render(); } };
A.add = (el) => openAdd({ meal: el.dataset.meal });
A.note = (el) => { day(cur).note = el.value; save(); };
A.water = (el) => { const D = day(cur); D.water = Math.max(0, D.water + (+el.dataset.d) * S.settings.glass); save(); haptic(); render(); };
A.waterSet = (el) => { const D = day(cur); const n = +el.dataset.n; D.water = D.water === n * S.settings.glass ? (n - 1) * S.settings.glass : n * S.settings.glass; save(); haptic(); render(); };
A.copyMeal = (el) => {
  const m = el.dataset.meal; const src = peekDay(addDays(cur, -1)).entries.filter((e) => e.meal === m);
  const D = day(cur); src.forEach((e) => D.entries.push({ ...e, id: uid(), ts: Date.now() })); save(); toast(t('copied')); render();
};
A.editEntry = (el) => { const e = peekDay(cur).entries.find((x) => x.id === el.dataset.id); if (e) openFood(null, { entry: e }); };
A.addEx = () => openExercise();
A.delEx = (el) => confirmBox(t('delActivity'), t('delete'), () => { const D = day(cur); D.ex = (D.ex || []).filter((x) => x.id !== el.dataset.id); save(); render(); });
A.rdays = (el) => { reportDays = +el.dataset.n; render(); };
A.csv = () => exportCsv();
A.addWeight = () => {
  const v = num($('#wIn').value); if (!(v > 20 && v < 400)) return toast(t('badWeight'));
  S.weights[dk()] = v; S.profile.weight = v; save(); render(); toast(t('saved'));
  offerHealth(() => runShortcut(S.settings.scWeight, JSON.stringify({ weight: v, date: dk() })));
};
A.delWeight = (el) => { delete S.weights[el.dataset.d]; save(); render(); };
A.healthImport = () => runShortcut(S.settings.scImport, '');
A.fastH = (el) => { S.fast.hours = +el.dataset.h; save(); render(); };
A.fastToggle = () => {
  const F = S.fast;
  if (F.start) { F.history.push({ start: F.start, end: Date.now() }); F.history = F.history.slice(-60); F.start = null; toast(t('fastSaved')); }
  else F.start = Date.now();
  save(); haptic(20); render();
};
A.saveGoals = () => {
  const g = S.goals; const P = num($('#gP').value), F = num($('#gF').value), C = num($('#gC').value);
  if (Math.round(P + F + C) !== 100) return toast(t('pct100', { n: r0(P + F + C) }));
  Object.assign(g, { kcal: r0(num($('#gK').value)) || g.kcal, water: r0(num($('#gW').value)) || g.water, pPct: P, fPct: F, cPct: C, fib: r0(num($('#gFb').value)) || g.fib });
  save(); render(); toast(t('saved'));
};
const readProfile = () => Object.assign(S.profile, { sex: $('#pS').value, age: num($('#pA').value) || 30, height: num($('#pH').value) || 170, weight: num($('#pW').value) || 70, activity: num($('#pAc').value), goal: $('#pG').value, pace: num($('#pP').value), target: num($('#pT').value) || 0 });
A.applyCalc = () => {
  readProfile(); const c = calcGoal(S.profile);
  S.goals.kcal = c.kcal;
  // белок ~1.8 г/кг при похудении, 1.6 иначе — пересчёт в %
  const pg = S.profile.weight * (S.profile.goal === 'lose' ? 1.8 : 1.6);
  const pPct = clamp(Math.round(pg * 4 / c.kcal * 100), 20, 40), fPct = 30;
  Object.assign(S.goals, { pPct, fPct, cPct: 100 - pPct - fPct, water: Math.round(S.profile.weight * 33 / 50) * 50 });
  save(); render(); toast(t('goalSet', { n: c.kcal }));
};
A.lang = (el) => { L = el.dataset.l; S.settings.lang = L; save(); render(); };
A.theme = (el) => { S.settings.theme = el.dataset.v; save(); applyTheme(); render(); };
A.glass = (el) => { S.settings.glass = +el.dataset.v; save(); render(); };
A.toggleEx = () => { S.settings.countExercise = !S.settings.countExercise; save(); render(); };
A.saveSc = () => { Object.assign(S.settings, { scFood: $('#scF').value.trim() || 'KBJU Food', scWeight: $('#scW').value.trim() || 'KBJU Weight', scImport: $('#scI').value.trim() || 'KBJU Import' }); save(); render(); toast(t('saved')); };
A.backup = () => download(`kbju-backup-${dk()}.json`, JSON.stringify(S), 'application/json');
A.restore = (el) => {
  const f = el.files[0]; if (!f) return;
  f.text().then((txt) => { const d = JSON.parse(txt); if (!d || typeof d !== 'object' || !d.days) throw 0; S = Object.assign(defaults(), d); save(); L = S.settings.lang || L; applyTheme(); render(); toast(t('restored')); }).catch(() => toast(t('badFile')));
};
A.wipe = () => confirmBox(t('wipeConfirm'), t('wipe'), () => { localStorage.removeItem(KEY); S = defaults(); save(); render(); });
A.healthDay = () => {
  const D = day(cur), T = dayTotals(cur), sent = D.sent || zeroN();
  const delta = Object.fromEntries(['kcal', 'p', 'f', 'c', 'fib', 'sug', 'sat', 'na'].map((k) => [k, Math.max(0, r1(T[k] - (sent[k] || 0)))]));
  if (delta.kcal < 1 && delta.p < 0.1 && delta.c < 0.1 && delta.f < 0.1) return toast(t('nothingToSend'));
  D.sent = { ...T }; save();
  runShortcut(S.settings.scFood, JSON.stringify({ date: cur, ...delta }));
};

function download(name, text, type) {
  const blob = new Blob([text], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportCsv() {
  const rows = [['date', 'meal', 'food', 'grams', 'kcal', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'sat_fat', 'sodium_mg']];
  Object.keys(S.days).sort().forEach((d) => S.days[d].entries.forEach((e) => { const n = entryN(e); rows.push([d, e.meal, e.name, r0(e.grams), r0(n.kcal), r1(n.p), r1(n.f), r1(n.c), r1(n.fib), r1(n.sug), r1(n.sat), r0(n.na)]); }));
  const csv = '﻿' + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  download(`kbju-diary-${dk()}.csv`, csv, 'text/csv');
}

// ---------- «Здоровье» через Быстрые команды ----------
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function runShortcut(name, text) {
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(text)}`;
  if (!isIOS) { toast(t('iosOnly')); return; }
  location.href = url;
}
function offerHealth(fn) { if (isIOS) setTimeout(() => { if (confirm(t('sendWeightQ'))) fn(); }, 300); }
function handleHash() {
  const h = location.hash.slice(1); if (!h) return;
  const p = new URLSearchParams(h);
  const w = num(p.get('w')); const ae = num(p.get('ae'));
  if (w > 20 && w < 400) { S.weights[dk()] = r1(w); S.profile.weight = r1(w); toast(t('weightImported', { n: r1(w) })); }
  if (ae > 0) { const D = day(dk()); D.ex = (D.ex || []).filter((x) => !x.health); D.ex.push({ id: uid(), name: t('healthActive'), kcal: r0(ae), health: true }); toast(t('aeImported', { n: r0(ae) })); }
  if (w || ae) { save(); history.replaceState(null, '', location.pathname); }
}

// ---------- добавление еды ----------
function openAdd({ meal = defaultMeal(), pick = null } = {}) {
  let tabSel = 'recent'; let q = ''; let timer;
  const html = `
    <div class="add-head">
      <div class="search glass-in">${icon('search')}<input id="q" type="search" placeholder="${t('searchPh')}" autocomplete="off" enterkeyhint="search"><button class="icon-btn accent" data-act="scan" aria-label="${t('scan')}">${icon('barcode')}</button></div>
      ${pick ? '' : `<div class="chips meals">${MEALS.map((m) => `<button class="chip ${m === meal ? 'on' : ''}" data-meal="${m}">${t('meal.' + m)}</button>`).join('')}</div>`}
      <div class="quick-acts">
        <button class="qa" data-act="scan">${icon('barcode')}<span>${t('scan')}</span></button>
        ${pick ? '' : `<button class="qa" data-act="quickAdd">${icon('bolt')}<span>${t('quickAdd')}</span></button>`}
        <button class="qa" data-act="newFood">${icon('plus')}<span>${t('newFood')}</span></button>
        ${pick ? '' : `<button class="qa" data-act="newRecipe">${icon('chef')}<span>${t('recipe')}</span></button>`}
      </div>
      <div class="seg sm tabs">${['recent', 'fav', 'mine', 'recipes'].map((k) => `<button data-t="${k}" class="${k === tabSel ? 'on' : ''}">${t('lst.' + k)}</button>`).join('')}</div>
    </div>
    <div id="res" class="results"></div>`;
  openSheet(html, {
    full: true,
    onMount: (b, sh) => {
      sh.meal = meal; sh.pick = pick; ADD = sh;
      const res = b.querySelector('#res'); const inp = b.querySelector('#q');
      const item = (f) => `<button class="food-row" data-key="${esc(f.key)}">${f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<div class="fr-ic">${icon(f.src === 'recipe' ? 'chef' : f.src === 'off' ? 'barcode' : f.src === 'custom' ? 'edit' : 'bowl')}</div>`}<div class="grow"><div class="e-name">${esc(f.name)}</div><div class="e-sub">${f.brand ? esc(f.brand) + ' · ' : ''}${t('p1')} ${r1(f.n.p)} · ${t('f1')} ${r1(f.n.f)} · ${t('c1')} ${r1(f.n.c)}</div></div><div class="e-kcal">${r0(f.n.kcal)}<small>${t('per100')}</small></div></button>`;
      const online = new Map();
      const showList = () => {
        let list = [];
        if (tabSel === 'recent') list = S.recents.map(getFood);
        if (tabSel === 'fav') list = S.favorites.map(getFood);
        if (tabSel === 'mine') list = Object.values(S.foods).filter((f) => f.src === 'custom').map((f) => getFood('F:' + f.id));
        if (tabSel === 'recipes') list = Object.values(S.recipes).map(recipeFood);
        list = list.filter(Boolean);
        res.innerHTML = list.length ? list.map(item).join('') : `<div class="empty-st">${icon(tabSel === 'fav' ? 'star' : 'search')}<p>${t('empty.' + tabSel)}</p></div>`;
      };
      const doSearch = () => {
        q = inp.value.trim(); clearTimeout(timer);
        b.querySelector('.tabs').style.display = q ? 'none' : '';
        if (!q) return showList();
        if (/^\d{8,14}$/.test(q)) { res.innerHTML = `<button class="food-row" data-code="${q}"><div class="fr-ic">${icon('barcode')}</div><div class="grow"><div class="e-name">${t('findBarcode')} ${q}</div></div></button>`; return; }
        const loc = searchLocal(q);
        res.innerHTML = loc.map(item).join('') + `<div class="sec-t">${icon('globe')} ${t('onlineDb')}</div><div id="onl" class="muted pad">${navigator.onLine ? `<span class="spin"></span> ${t('searching')}` : t('offline')}</div>`;
        if (!navigator.onLine || q.length < 2) return;
        timer = setTimeout(async () => {
          try {
            const r = await offSearch(q); const box = res.querySelector('#onl'); if (!box || inp.value.trim() !== q) return;
            r.forEach((f) => online.set('O:' + f.id, f));
            box.outerHTML = r.length ? r.map((f) => item({ ...f, key: 'O:' + f.id })).join('') : `<div class="muted pad">${t('nothingFound')}</div>`;
          } catch (e) { if (e.name !== 'AbortError') { const box = res.querySelector('#onl'); if (box) box.textContent = t('netError'); } }
        }, 450);
      };
      inp.addEventListener('input', doSearch);
      b.querySelectorAll('.tabs button').forEach((x) => x.onclick = () => { tabSel = x.dataset.t; b.querySelectorAll('.tabs button').forEach((y) => y.classList.toggle('on', y === x)); showList(); });
      b.querySelectorAll('.meals .chip').forEach((x) => x.onclick = () => { sh.meal = x.dataset.meal; b.querySelectorAll('.meals .chip').forEach((y) => y.classList.toggle('on', y === x)); });
      res.addEventListener('click', (e) => {
        const r = e.target.closest('.food-row'); if (!r) return;
        if (r.dataset.code) return lookupBarcode(r.dataset.code);
        const k = r.dataset.key;
        if (k.startsWith('O:')) { const f = online.get(k); const key = cacheOff(f); return openFood(getFood(key)); }
        openFood(getFood(k));
      });
      showList();
    },
    onClose: () => { ADD = null; offCtl?.abort(); },
  });
}
let ADD = null; // активная шторка добавления (приём пищи / режим выбора)
A.quickAdd = () => openQuick();
A.newFood = () => openFoodForm({});
A.newRecipe = () => openRecipe();
A.scan = () => openScanner();

// карточка продукта / порции
function openFood(food, { entry = null } = {}) {
  if (entry) food = getFood(entry.ref) || { key: entry.ref, name: entry.name, brand: '', n: entry.n, servings: [] };
  if (!food) return;
  if (entry?.quick) return openQuick(entry);
  const pick = ADD?.pick;
  let grams = entry ? entry.grams : (food.servings[0]?.g || 100);
  let meal = entry ? entry.meal : (ADD?.meal || defaultMeal());
  const srv = [{ name: '100 ' + t('g'), g: 100 }, ...food.servings.filter((s) => s.g > 0 && s.g !== 100)];
  const canEdit = food.key.startsWith('F:') && !!S.foods[food.key.slice(2)];
  const html = `
    <div class="food-head">${food.img ? `<img src="${esc(food.img)}" alt="" onerror="this.remove()">` : ''}<div class="grow"><h2>${esc(food.name)}</h2>${food.brand ? `<p class="muted">${esc(food.brand)}</p>` : ''}${food.barcode ? `<p class="muted small">${icon('barcode', 'inl')} ${esc(food.barcode)}</p>` : ''}</div>
      <button class="icon-btn ${isFav(food.key) ? 'fav' : ''}" id="favB" aria-label="fav">${icon('star')}</button>
      ${canEdit ? `<button class="icon-btn" id="editB" aria-label="edit">${icon('edit')}</button>` : ''}</div>
    <div class="portion">
      <button class="icon-btn big" id="gm">${icon('minus')}</button>
      <label class="g-in"><input id="g" inputmode="decimal" value="${r1(grams)}"><span>${t('g')}</span></label>
      <button class="icon-btn big" id="gp">${icon('plus')}</button>
    </div>
    <div class="chips center" id="srv">${srv.map((s) => `<button class="chip" data-g="${s.g}">${esc(s.name)}${s.g !== 100 ? ` · ${r0(s.g)} ${t('g')}` : ''}</button>`).join('')}</div>
    <div id="nut"></div>
    ${pick ? '' : `<div class="chips center meals">${MEALS.map((m) => `<button class="chip ${m === meal ? 'on' : ''}" data-meal="${m}">${t('meal.' + m)}</button>`).join('')}</div>`}
    <div class="row gap mt">${entry ? `<button class="btn danger-ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn accent grow" id="ok">${entry ? t('save') : pick ? t('addToRecipe') : t('add')}</button></div>`;
  openSheet(html, {
    onMount: (b, sh) => {
      const g = b.querySelector('#g');
      const upd = () => {
        grams = num(g.value); const n = scaleN(food.n, grams); const k = n.p * 4 + n.f * 9 + n.c * 4 || 1;
        b.querySelector('#nut').innerHTML = `
          <div class="big-kcal">${r0(n.kcal)} <small>${t('kcal')}</small></div>
          <div class="pfc">
            <div class="pfc-i p"><b>${r1(n.p)}</b><small>${t('protein')}</small><i style="width:${n.p * 4 / k * 100}%"></i></div>
            <div class="pfc-i f"><b>${r1(n.f)}</b><small>${t('fat')}</small><i style="width:${n.f * 9 / k * 100}%"></i></div>
            <div class="pfc-i c"><b>${r1(n.c)}</b><small>${t('carbs')}</small><i style="width:${n.c * 4 / k * 100}%"></i></div>
          </div>
          <details class="micro"><summary>${t('more')}</summary>
            <div class="li"><span class="grow">${t('fiber')}</span><b>${r1(n.fib)} ${t('g')}</b></div>
            <div class="li"><span class="grow">${t('sugar')}</span><b>${r1(n.sug)} ${t('g')}</b></div>
            <div class="li"><span class="grow">${t('satFat')}</span><b>${r1(n.sat)} ${t('g')}</b></div>
            <div class="li"><span class="grow">${t('sodium')}</span><b>${r0(n.na)} ${t('mg')}</b></div>
            <div class="li"><span class="grow">${t('per100')}</span><b>${r0(food.n.kcal)} ${t('kcal')} · ${r1(food.n.p)}/${r1(food.n.f)}/${r1(food.n.c)}</b></div>
            ${goalShare(n)}
          </details>`;
        b.querySelectorAll('#srv .chip').forEach((c) => c.classList.toggle('on', Math.abs(+c.dataset.g - grams) < 0.01));
      };
      const step = grams >= 50 ? 10 : 5;
      g.addEventListener('input', upd);
      g.addEventListener('focus', () => g.select());
      b.querySelector('#gm').onclick = () => { g.value = r1(Math.max(0, num(g.value) - step)); upd(); };
      b.querySelector('#gp').onclick = () => { g.value = r1(num(g.value) + step); upd(); };
      b.querySelectorAll('#srv .chip').forEach((c) => c.onclick = () => { g.value = c.dataset.g; upd(); });
      b.querySelectorAll('.meals .chip').forEach((x) => x.onclick = () => { meal = x.dataset.meal; b.querySelectorAll('.meals .chip').forEach((y) => y.classList.toggle('on', y === x)); });
      b.querySelector('#favB').onclick = (e) => { const k = food.key; S.favorites = isFav(k) ? S.favorites.filter((x) => x !== k) : [k, ...S.favorites]; save(); e.currentTarget.classList.toggle('fav', isFav(k)); haptic(); };
      b.querySelector('#editB')?.addEventListener('click', () => { closeSheet(sh); openFoodForm(S.foods[food.key.slice(2)]); });
      b.querySelector('#del')?.addEventListener('click', () => { const D = day(cur); D.entries = D.entries.filter((x) => x.id !== entry.id); save(); closeSheet(sh); render(); toast(t('deleted')); });
      b.querySelector('#ok').onclick = () => {
        if (!(grams > 0)) return toast(t('enterGrams'));
        if (pick) { pick({ name: food.name, grams, n: { ...food.n }, ref: food.key }); closeSheet(sh); closeSheet(ADD); return; }
        const D = day(cur);
        if (entry) Object.assign(D.entries.find((x) => x.id === entry.id) || {}, { grams, meal });
        else D.entries.push({ id: uid(), meal, ref: food.key, name: food.name, grams, n: { ...food.n }, ts: Date.now() });
        touchRecent(food.key); save(); haptic(15);
        closeAll(); render(); toast(entry ? t('saved') : t('added', { n: r0(food.n.kcal * grams / 100) }));
      };
      upd();
    },
  });
}
function goalShare(n) {
  const G = goalG();
  return `<div class="share">${[['kcal', t('kcal'), G.kcal], ['p', t('protein'), G.p], ['f', t('fat'), G.f], ['c', t('carbs'), G.c]].map(([k, lab, gv]) => `<span>${lab}<b>${r0(n[k] / gv * 100)}%</b></span>`).join('')}</div><p class="muted small">${t('ofDaily')}</p>`;
}

// быстрое добавление
function openQuick(entry) {
  const n = entry ? entry.n : zeroN(); let meal = entry ? entry.meal : (ADD?.meal || defaultMeal());
  openSheet(`<h2>${icon('bolt')} ${t('quickAdd')}</h2>
    <label class="fld"><span>${t('name')}</span><input class="input" id="qn" value="${esc(entry?.name || '')}" placeholder="${t('quickAdd')}"></label>
    <div class="grid2">
      <label class="fld"><span>${t('kcal')}</span><input class="input" id="qk" inputmode="decimal" value="${entry ? r0(n.kcal) : ''}"></label>
      <label class="fld"><span>${t('protein')}, ${t('g')}</span><input class="input" id="qp" inputmode="decimal" value="${entry ? r1(n.p) : ''}"></label>
      <label class="fld"><span>${t('fat')}, ${t('g')}</span><input class="input" id="qf" inputmode="decimal" value="${entry ? r1(n.f) : ''}"></label>
      <label class="fld"><span>${t('carbs')}, ${t('g')}</span><input class="input" id="qc" inputmode="decimal" value="${entry ? r1(n.c) : ''}"></label>
    </div>
    <div class="chips center meals">${MEALS.map((m) => `<button class="chip ${m === meal ? 'on' : ''}" data-meal="${m}">${t('meal.' + m)}</button>`).join('')}</div>
    <div class="row gap mt">${entry ? `<button class="btn danger-ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn accent grow" id="ok">${t('save')}</button></div>`, {
    onMount: (b, sh) => {
      b.querySelectorAll('.meals .chip').forEach((x) => x.onclick = () => { meal = x.dataset.meal; b.querySelectorAll('.meals .chip').forEach((y) => y.classList.toggle('on', y === x)); });
      b.querySelector('#del')?.addEventListener('click', () => { const D = day(cur); D.entries = D.entries.filter((x) => x.id !== entry.id); save(); closeAll(); render(); });
      b.querySelector('#ok').onclick = () => {
        const p = num($('#qp', b).value), f = num($('#qf', b).value), c = num($('#qc', b).value);
        let k = num($('#qk', b).value); if (!k) k = p * 4 + f * 9 + c * 4;
        if (!k) return toast(t('enterKcal'));
        const nn = { ...zeroN(), kcal: k, p, f, c };
        const D = day(cur);
        if (entry) Object.assign(D.entries.find((x) => x.id === entry.id), { n: nn, meal, name: $('#qn', b).value.trim() || t('quickAdd') });
        else D.entries.push({ id: uid(), meal, quick: true, name: $('#qn', b).value.trim() || t('quickAdd'), grams: 100, n: nn, ts: Date.now() });
        save(); closeAll(); render(); toast(t('saved'));
      };
    },
  });
}

// активность
const EX = [['walk', 3.5], ['run', 9.8], ['gym', 5], ['bike', 7.5], ['swim', 7], ['yoga', 2.5], ['other', 4]];
function openExercise() {
  let type = 'walk';
  openSheet(`<h2>${icon('run')} ${t('activity')}</h2>
    <div class="chips center">${EX.map(([k]) => `<button class="chip ${k === type ? 'on' : ''}" data-k="${k}">${t('ex.' + k)}</button>`).join('')}</div>
    <div class="grid2"><label class="fld"><span>${t('minutes')}</span><input class="input" id="xm" inputmode="numeric" placeholder="30"></label>
    <label class="fld"><span>${t('kcal')}</span><input class="input" id="xk" inputmode="numeric" placeholder="${t('auto')}"></label></div>
    <p class="muted small">${t('exHint')}</p>
    <button class="btn accent wide" id="ok">${t('add')}</button>`, {
    onMount: (b) => {
      const est = () => { const met = EX.find((x) => x[0] === type)[1]; const m = num($('#xm', b).value); $('#xk', b).placeholder = m ? r0(met * S.profile.weight * m / 60) : t('auto'); };
      b.querySelectorAll('.chip').forEach((x) => x.onclick = () => { type = x.dataset.k; b.querySelectorAll('.chip').forEach((y) => y.classList.toggle('on', y === x)); est(); });
      $('#xm', b).addEventListener('input', est);
      b.querySelector('#ok').onclick = () => {
        const m = num($('#xm', b).value); let k = num($('#xk', b).value);
        if (!k) k = EX.find((x) => x[0] === type)[1] * S.profile.weight * m / 60;
        if (!k) return toast(t('enterKcal'));
        const D = day(cur); (D.ex ||= []).push({ id: uid(), name: t('ex.' + type), min: m, kcal: r0(k) }); save(); closeAll(); render();
      };
    },
  });
}

// ---------- свой продукт ----------
function openFoodForm(f = {}, { onSaved } = {}) {
  const isNew = !f.id; const n = f.n || {};
  const sv = f.servings?.[0] || { name: '', g: '' };
  let basis = 100;
  const fld = (id, lab, v, mode = 'decimal') => `<label class="fld"><span>${lab}</span><input class="input" id="${id}" inputmode="${mode}" value="${v === undefined || v === '' || v === null ? '' : v}"></label>`;
  openSheet(`<h2>${isNew ? t('newFood') : t('editFood')}</h2>
    ${isNew ? `<label class="btn ghost wide ocr-btn">${icon('photo')} ${t('ocrBtn')}<input type="file" accept="image/*" capture="environment" hidden id="ocrIn"></label><p class="muted small center" id="ocrSt">${t('ocrHint')}</p>` : ''}
    ${fld('fn', t('name'), esc(f.name || ''), 'text')}
    <div class="grid2">${fld('fb', t('brand'), esc(f.brand || ''), 'text')}${fld('fc', t('barcode'), esc(f.barcode || ''), 'numeric')}</div>
    <div class="seg sm" id="basis"><button class="on" data-b="100">${t('per100g')}</button><button data-b="srv">${t('perServing')}</button></div>
    <div class="grid2">${fld('fsn', t('servingName'), esc(sv.name || ''), 'text')}${fld('fsg', t('servingG'), sv.g || '')}</div>
    <div class="grid2">
      ${fld('nk', t('kcal'), n.kcal != null ? r1(n.kcal) : '')}${fld('np', t('protein') + ', ' + t('g'), n.p != null ? r1(n.p) : '')}
      ${fld('nf', t('fat') + ', ' + t('g'), n.f != null ? r1(n.f) : '')}${fld('nc', t('carbs') + ', ' + t('g'), n.c != null ? r1(n.c) : '')}
      ${fld('nfb', t('fiber') + ', ' + t('g'), n.fib ? r1(n.fib) : '')}${fld('ns', t('sugar') + ', ' + t('g'), n.sug ? r1(n.sug) : '')}
      ${fld('nsat', t('satFat') + ', ' + t('g'), n.sat ? r1(n.sat) : '')}${fld('nna', t('sodium') + ', ' + t('mg'), n.na ? r0(n.na) : '')}
    </div>
    <p class="warn small" id="chk"></p>
    <div class="row gap mt">${!isNew ? `<button class="btn danger-ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn accent grow" id="ok">${t('save')}</button></div>`, {
    full: true,
    onMount: (b, sh) => {
      const v = (id) => num($('#' + id, b).value);
      const check = () => {
        const k = v('nk'), calc = v('np') * 4 + v('nf') * 9 + v('nc') * 4;
        $('#chk', b).textContent = k && calc && Math.abs(k - calc) > Math.max(25, k * 0.2) ? t('kcalMismatch', { n: r0(calc) }) : '';
      };
      $$('input', b).forEach((i) => i.addEventListener('input', check));
      $$('#basis button', b).forEach((x) => x.onclick = () => { basis = x.dataset.b === 'srv' ? 'srv' : 100; $$('#basis button', b).forEach((y) => y.classList.toggle('on', y === x)); });
      $('#ocrIn', b)?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const st = $('#ocrSt', b); st.innerHTML = `<span class="spin"></span> ${t('ocrRun')}`;
        try {
          const r = await ocrLabel(file, (p) => { st.innerHTML = `<span class="spin"></span> ${t('ocrRun')} ${Math.round(p * 100)}%`; });
          const map = { kcal: 'nk', p: 'np', f: 'nf', c: 'nc', fib: 'nfb', sug: 'ns', sat: 'nsat', na: 'nna' };
          let cnt = 0; for (const k in map) if (r[k] != null) { $('#' + map[k], b).value = r[k]; cnt++; }
          if (!$('#nk', b).value && (r.p || r.f || r.c)) $('#nk', b).value = r0((r.p || 0) * 4 + (r.f || 0) * 9 + (r.c || 0) * 4);
          st.textContent = cnt ? t('ocrOk', { n: cnt }) : t('ocrFail'); check();
        } catch (err) { console.warn(err); st.textContent = t('ocrFail'); }
      });
      $('#del', b)?.addEventListener('click', () => confirmBox(t('delFoodQ'), t('delete'), () => { delete S.foods[f.id]; S.favorites = S.favorites.filter((k) => k !== 'F:' + f.id); S.recents = S.recents.filter((k) => k !== 'F:' + f.id); save(); closeSheet(sh); toast(t('deleted')); }));
      $('#ok', b).onclick = () => {
        const name = $('#fn', b).value.trim(); if (!name) return toast(t('enterName'));
        const sg = v('fsg');
        if (basis === 'srv' && !sg) return toast(t('enterServing'));
        const mul = basis === 'srv' ? 100 / sg : 1;
        let nn = { kcal: v('nk'), p: v('np'), f: v('nf'), c: v('nc'), fib: v('nfb'), sug: v('ns'), sat: v('nsat'), na: v('nna') };
        if (!nn.kcal) nn.kcal = nn.p * 4 + nn.f * 9 + nn.c * 4;
        if (!nn.kcal) return toast(t('enterKcal'));
        nn = Object.fromEntries(Object.entries(nn).map(([k, x]) => [k, Math.round(x * mul * 100) / 100]));
        const id = f.id || uid();
        S.foods[id] = { id, name, brand: $('#fb', b).value.trim(), barcode: $('#fc', b).value.trim(), n: nn, servings: sg ? [{ name: $('#fsn', b).value.trim() || t('srv.portion'), g: sg }] : [], img: f.img || '', src: 'custom' };
        save(); closeSheet(sh); toast(t('saved'));
        if (onSaved) onSaved('F:' + id); else if (isNew) openFood(getFood('F:' + id));
      };
      check();
    },
  });
}

// ---------- рецепты ----------
function openRecipe(r) {
  r = r ? JSON.parse(JSON.stringify(r)) : { id: uid(), name: '', servings: 4, cooked: 0, items: [] };
  openSheet(`<h2>${icon('chef')} ${t('recipe')}</h2>
    <label class="fld"><span>${t('name')}</span><input class="input" id="rn" value="${esc(r.name)}"></label>
    <div class="grid2"><label class="fld"><span>${t('servings')}</span><input class="input" id="rs" inputmode="numeric" value="${r.servings}"></label>
    <label class="fld"><span>${t('cookedW')}</span><input class="input" id="rw" inputmode="numeric" value="${r.cooked || ''}" placeholder="${t('auto')}"></label></div>
    <div id="ri"></div>
    <button class="btn ghost wide" id="addI">${icon('plus')} ${t('addIngredient')}</button>
    <div id="rt" class="rtot"></div>
    <div class="row gap mt">${S.recipes[r.id] ? `<button class="btn danger-ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn accent grow" id="ok">${t('save')}</button></div>`, {
    full: true,
    onMount: (b, sh) => {
      const draw = () => {
        r.servings = num($('#rs', b).value) || 1; r.cooked = num($('#rw', b).value);
        $('#ri', b).innerHTML = r.items.map((it, i) => `<div class="li"><span class="grow">${esc(it.name)} <small class="muted">${r0(it.grams)} ${t('g')}</small></span><b>${r0(it.n.kcal * it.grams / 100)}</b><button class="icon-btn sm" data-i="${i}">${icon('x')}</button></div>`).join('') || `<p class="muted small">${t('noIngredients')}</p>`;
        $$('#ri [data-i]', b).forEach((x) => x.onclick = () => { r.items.splice(+x.dataset.i, 1); draw(); });
        if (r.items.length) { const f = recipeFood(r); const per = scaleN(f.total, 100 / r.servings); const p100 = f.n;
          $('#rt', b).innerHTML = `<div class="li"><span class="grow">${t('perPortion')} (${r0(f.totalW / r.servings)} ${t('g')})</span><b>${r0(per.kcal)} ${t('kcal')} · ${r1(per.p)}/${r1(per.f)}/${r1(per.c)}</b></div><div class="li"><span class="grow">${t('per100')}</span><b>${r0(p100.kcal)} ${t('kcal')} · ${r1(p100.p)}/${r1(p100.f)}/${r1(p100.c)}</b></div>`; }
        else $('#rt', b).innerHTML = '';
      };
      $('#rs', b).addEventListener('input', draw); $('#rw', b).addEventListener('input', draw);
      $('#addI', b).onclick = () => openAdd({ pick: (it) => { r.items.push(it); draw(); } });
      $('#del', b)?.addEventListener('click', () => confirmBox(t('delRecipeQ'), t('delete'), () => { delete S.recipes[r.id]; save(); closeSheet(sh); }));
      $('#ok', b).onclick = () => {
        r.name = $('#rn', b).value.trim(); if (!r.name) return toast(t('enterName')); if (!r.items.length) return toast(t('noIngredients'));
        S.recipes[r.id] = r; save(); closeSheet(sh); toast(t('saved'));
      };
      draw();
    },
  });
}

// ---------- сканер ----------
let scanStop = null;
function openScanner() {
  openSheet(`<div class="scan">
    <video id="vid" playsinline muted autoplay></video>
    <div class="scan-frame"><i></i></div>
    <div class="scan-top"><button class="icon-btn glass" data-close>${icon('x')}</button><span class="scan-st glass" id="sst">${t('scanHint')}</span><button class="icon-btn glass" id="torch" hidden>${icon('flash')}</button></div>
    <div class="scan-bottom glass"><input class="input" id="manual" inputmode="numeric" placeholder="${t('manualCode')}"><button class="btn accent" id="go">${t('find')}</button></div>
  </div>`, {
    full: true, cls: 'scanner',
    onMount: async (b, sh) => {
      b.querySelector('[data-close]').onclick = () => closeSheet(sh);
      const go = () => { const c = $('#manual', b).value.replace(/\D/g, ''); if (c.length >= 6) { closeSheet(sh); lookupBarcode(c); } };
      $('#go', b).onclick = go; $('#manual', b).addEventListener('keydown', (e) => e.key === 'Enter' && go());
      const st = $('#sst', b); const video = $('#vid', b);
      let done = false;
      const found = (code) => { if (done) return; done = true; haptic(40); closeSheet(sh); lookupBarcode(code); };
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocam');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!sheets.includes(sh)) { stream.getTracks().forEach((x) => x.stop()); return; }
        video.srcObject = stream; await video.play().catch(() => {});
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        if (caps.torch) { const tb = $('#torch', b); tb.hidden = false; let on = false; tb.onclick = () => { on = !on; track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {}); tb.classList.toggle('on', on); }; }
        let raf = 0, zx = null;
        scanStop = () => { cancelAnimationFrame(raf); clearTimeout(raf); try { zx?.reset(); } catch {} stream.getTracks().forEach((x) => x.stop()); scanStop = null; };
        let native = null;
        if ('BarcodeDetector' in window) {
          try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes('ean_13')) native = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] }); } catch {}
        }
        if (native) {
          const loop = async () => { if (done || !scanStop) return; try { const r = await native.detect(video); if (r[0]?.rawValue) return found(r[0].rawValue); } catch {} raf = setTimeout(loop, 120); };
          loop();
        } else {
          await loadScript('vendor/zxing.min.js');
          const Z = window.ZXing; const hints = new Map();
          hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
          hints.set(Z.DecodeHintType.TRY_HARDER, true);
          zx = new Z.BrowserMultiFormatReader(hints, 150);
          zx.decodeFromVideoElementContinuously(video, (res) => { if (res) found(res.getText()); });
        }
      } catch (e) {
        console.warn(e); st.textContent = t('noCamera');
      }
    },
    onClose: () => scanStop?.(),
  });
}
const scripts = {};
function loadScript(src) {
  return scripts[src] ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('load ' + src)); }; document.head.appendChild(s); });
}
async function lookupBarcode(code) {
  code = String(code).trim();
  const local = findByBarcode(code);
  if (local) return openFood(getFood('F:' + local.id));
  const wait = openSheet(`<div class="center pad"><span class="spin big"></span><p>${t('lookingUp')} ${esc(code)}</p></div>`);
  try {
    const r = await offProduct(code);
    closeSheet(wait);
    if (r && r.has) { const key = cacheOff(r.food); return openFood(getFood(key)); }
    toast(r ? t('noNutrition') : t('notFound'));
    openFoodForm({ barcode: code, name: r?.food.name && r.food.name !== code ? r.food.name : '', brand: r?.food.brand || '', img: r?.food.img || '' });
  } catch {
    closeSheet(wait); toast(t('netErrorCreate'));
    openFoodForm({ barcode: code });
  }
}

// ---------- OCR этикетки (иврит / англ / рус) ----------
async function ocrLabel(file, onProgress) {
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
  const img = await prepImage(file);
  const worker = await Tesseract.createWorker(['heb', 'eng', 'rus'], 1, { logger: (m) => m.status === 'recognizing text' && onProgress?.(m.progress) });
  try { const { data } = await worker.recognize(img); return parseLabel(data.text); } finally { worker.terminate(); }
}
async function prepImage(file) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)) * (Math.max(bmp.width, bmp.height) < 1000 ? 2 : 1);
  const c = document.createElement('canvas'); c.width = bmp.width * sc; c.height = bmp.height * sc;
  const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.4)'; x.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
function parseLabel(text) {
  const lines = text.split(/\n+/).map((l) => l.replace(/[|]/g, ' ').trim()).filter(Boolean);
  const R = {
    kcal: /(קלורי|אנרגי|energy|calor|kcal|ккал|калор|энерг)/i,
    p: /(חלבונ|protein|белк|белок)/i,
    f: /(שומנים(?!\s*רוו)|סה.?כ שומנ|^שומנ|total fat|^fat|fats?\b|жир(?!н))/i,
    sat: /(רוו|saturat|насыщ)/i,
    c: /(פחמימות|carbohydr|углевод)/i,
    sug: /(סוכר|sugar|сахар)/i,
    fib: /(סיבים|fib(er|re)|клетчат|волокн)/i,
    na: /(נתרן|sodium|натри)/i,
  };
  const out = {};
  const nums = (l) => (l.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(',', '.')));
  for (const l of lines) {
    for (const k of ['sat', 'sug', 'fib', 'na', 'kcal', 'p', 'c', 'f']) {
      if (out[k] != null || !R[k].test(l)) continue;
      if (k === 'f' && R.sat.test(l)) continue;
      if (k === 'c' && R.sug.test(l) && !/פחמימות|carbohydr|углевод/i.test(l)) continue;
      let ns = nums(l).filter((x) => x < 5000);
      if (k === 'kcal' && /kj|קילוג׳?ול|кдж/i.test(l) && ns.length > 1) ns = ns.filter((x, i) => i % 2 === 1 || !/kj/i.test(l));
      if (!ns.length) continue;
      out[k] = ns[0];
      break;
    }
  }
  if (out.kcal > 950) delete out.kcal; // вероятно кДж
  return out;
}

// ---------- запуск ----------
function init() {
  applyLang(); applyTheme(); handleHash();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  $('#fab').onclick = () => { haptic(); openAdd({}); };
  window.addEventListener('hashchange', () => { handleHash(); render(); });
  // таймер голодания
  setInterval(() => { if (tab === 'progress' && S.fast.start && !sheets.length) render(); }, 30000);
  // смена дня
  let lastToday = dk();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && dk() !== lastToday) { if (cur === lastToday) cur = dk(); lastToday = dk(); render(); } });
  // свайп по дневнику для смены дня
  let sx = null, sy = 0;
  $('#view').addEventListener('touchstart', (e) => { if (tab !== 'diary') return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  $('#view').addEventListener('touchend', (e) => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 40) { const dir = (dx < 0 ? 1 : -1) * (L === 'he' ? -1 : 1); cur = addDays(cur, dir); render(); }
  });
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.KBJU = { S: () => S, lookupBarcode, parseLabel, render };
}
init();
})();

(() => {
  'use strict';

  // ---------- 存储 ----------
  const P = 'etf26:';
  const load = (k, d) => { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));

  let Q = [], byId = new Map();
  let answers = load('answers', {});          // {id: "B"}
  let wrong = load('wrong', []);              // [id]
  let favs = load('favs', []);                // [id]
  let pos = load('pos', { seq: 0, rand: 0, wrong: 0, fav: 0 });
  let randOrder = load('randOrder', []);
  let mode = load('mode', 'seq');

  let list = [];             // 当前模式的题目 id 列表
  let session = {};          // 错题本模式中本轮作答 {id: "B"}
  let advanceTimer = null;

  const MODE_NAME = { seq: '顺序练习', rand: '随机练习', wrong: '错题本', fav: '收藏' };
  const $ = (id) => document.getElementById(id);
  const keyOf = (i) => String.fromCharCode(65 + i);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1500);
  }

  // ---------- 模式 ----------
  function buildList(m) {
    if (m === 'seq') return Q.map((q) => q.id);
    if (m === 'rand') {
      const valid = randOrder.length === Q.length && randOrder.every((id) => byId.has(id));
      if (!valid) { randOrder = shuffle(Q.map((q) => q.id)); save('randOrder', randOrder); pos.rand = 0; }
      return randOrder;
    }
    if (m === 'wrong') return wrong.filter((id) => byId.has(id));
    if (m === 'fav') return favs.filter((id) => byId.has(id));
    return [];
  }

  function setMode(m, startId) {
    mode = m; save('mode', mode);
    session = {};
    list = buildList(m);
    if (startId != null) { const i = list.indexOf(startId); if (i >= 0) pos[m] = i; }
    pos[m] = Math.min(Math.max(pos[m] || 0, 0), Math.max(list.length - 1, 0));
    save('pos', pos);
    render();
  }

  // 当前模式下某题的作答（错题本模式只看本轮）
  const answerOf = (id) => (mode === 'wrong' ? session[id] : answers[id]);
  const curId = () => list[pos[mode]];

  // ---------- 渲染 ----------
  function render() {
    clearTimeout(advanceTimer);
    $('modeTitle').textContent = MODE_NAME[mode];
    updateStats();

    const box = $('qBox');
    const n = list.length, i = pos[mode];
    $('idxBtn').textContent = n ? `${i + 1}/${n}` : '0/0';
    $('prevBtn').disabled = !n || i === 0;
    $('nextBtn').disabled = !n || i >= n - 1;
    $('favBtn').disabled = !n;

    if (!n) {
      $('favBtn').textContent = '☆'; $('favBtn').classList.remove('on');
      box.innerHTML = mode === 'wrong'
        ? `<div class="empty"><div class="big">🎉</div>错题本是空的<br>答错的题会自动加入这里<button data-go="seq">去练习</button></div>`
        : `<div class="empty"><div class="big">⭐</div>还没有收藏题目<br>答题时点底部 ☆ 即可收藏<button data-go="seq">去练习</button></div>`;
      return;
    }

    const id = curId(), q = byId.get(id), my = answerOf(id);
    const isFav = favs.includes(id);
    $('favBtn').textContent = isFav ? '★' : '☆';
    $('favBtn').classList.toggle('on', isFav);

    const dName = ['', '简单', '中等', '困难'][q.d] || '';
    let html = `<div class="q-meta">`
      + (dName ? `<span class="tag d${q.d}">${dName}</span>` : '') + `<span>第 ${i + 1} 题</span></div>`
      + `<div class="q-title">${esc(q.t)}</div><div class="opts">`;
    q.o.forEach((txt, k) => {
      const key = keyOf(k);
      let cls = '';
      if (my) {
        if (key === q.a) cls = 'ok';
        else if (key === my) cls = 'bad';
        else cls = 'dim';
      }
      html += `<button class="opt ${cls}" data-key="${key}" ${my ? 'disabled' : ''}>`
        + `<span class="key">${cls === 'ok' ? '✓' : cls === 'bad' ? '✗' : key}</span><span class="txt">${esc(txt)}</span></button>`;
    });
    html += '</div>';
    if (my) {
      const ok = my === q.a;
      html += `<div class="result ${ok ? 'ok' : 'bad'}"><span>${ok ? '✓ 回答正确' : `✗ 回答错误，正确答案 ${q.a}`}</span>`
        + `<button class="redo" data-redo>重做本题</button></div>`;
    }
    box.innerHTML = html;
  }

  function updateStats() {
    const ids = Object.keys(answers).filter((id) => byId.has(+id));
    const done = ids.length;
    const right = ids.filter((id) => answers[id] === byId.get(+id).a).length;
    const rate = done ? Math.round((right / done) * 100) : 0;
    $('rate').innerHTML = done ? `正确率 ${rate}%<br>已做 ${done}/${Q.length}` : `共 ${Q.length} 题`;
    $('drawerStats').textContent = `已做 ${done}/${Q.length} · 正确率 ${rate}%`;
    $('wrongCount').textContent = wrong.length;
    $('favCount').textContent = favs.length;
    document.querySelectorAll('.menu [data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  }

  // ---------- 作答 ----------
  function choose(key) {
    const id = curId(), q = byId.get(id);
    if (answerOf(id)) return;
    answers[id] = key; save('answers', answers);
    if (mode === 'wrong') session[id] = key;
    const ok = key === q.a;
    if (!ok && !wrong.includes(id)) { wrong.push(id); save('wrong', wrong); }
    if (ok && mode === 'wrong') { wrong = wrong.filter((x) => x !== id); save('wrong', wrong); }
    if (navigator.vibrate && !ok) navigator.vibrate(30);
    render();
    if (ok && pos[mode] < list.length - 1) {
      const at = pos[mode];
      advanceTimer = setTimeout(() => { if (pos[mode] === at && curId() === id) go(1); }, 600);
    } else if (ok) {
      toast(mode === 'wrong' ? '本轮错题已做完' : '已经是最后一题');
    }
  }

  function redo() {
    const id = curId();
    if (mode === 'wrong') delete session[id];
    else { delete answers[id]; save('answers', answers); }
    render();
  }

  function go(step) {
    const n = pos[mode] + step;
    if (n < 0 || n >= list.length) return;
    pos[mode] = n; save('pos', pos);
    render();
    window.scrollTo(0, 0);
  }

  function toggleFav() {
    const id = curId(); if (id == null) return;
    if (favs.includes(id)) { favs = favs.filter((x) => x !== id); toast('已取消收藏'); }
    else { favs.push(id); toast('已收藏'); }
    save('favs', favs);
    render();
  }

  // ---------- 抽屉 / 答题卡 ----------
  const openDrawer = (on) => { $('drawer').classList.toggle('show', on); $('drawerMask').classList.toggle('show', on); };

  function openCard(on) {
    $('cardSheet').classList.toggle('show', on); $('cardMask').classList.toggle('show', on);
    if (!on) return;
    const cur = pos[mode];
    $('cardGrid').innerHTML = list.map((id, i) => {
      const my = answerOf(id);
      const cls = my ? (my === byId.get(id).a ? 'ok' : 'bad') : '';
      return `<button class="${cls}${i === cur ? ' cur' : ''}" data-i="${i}">${i + 1}</button>`;
    }).join('');
    const el = $('cardGrid').querySelector('.cur');
    if (el) el.scrollIntoView({ block: 'center' });
  }

  // ---------- 搜索 ----------
  function openSearch(on) {
    $('searchPage').classList.toggle('show', on);
    if (on) { openDrawer(false); setTimeout(() => $('searchInput').focus(), 50); doSearch(); }
  }

  function hl(text, kw) {
    const s = esc(text);
    if (!kw) return s;
    const re = new RegExp(esc(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return s.replace(re, (m) => `<mark>${m}</mark>`);
  }

  function doSearch() {
    const kw = $('searchInput').value.trim();
    const listEl = $('searchList');
    if (!kw) { $('searchInfo').textContent = `输入关键字，在 ${Q.length} 道题中搜索`; listEl.innerHTML = ''; return; }
    const low = kw.toLowerCase();
    const hits = Q.filter((q) => q.t.toLowerCase().includes(low) || q.o.some((o) => o.toLowerCase().includes(low)));
    const shown = hits.slice(0, 100);
    $('searchInfo').textContent = `找到 ${hits.length} 题` + (hits.length > 100 ? '（显示前 100 条）' : '') + ' · 点击可跳转作答';
    listEl.innerHTML = shown.map((q) => {
      const opts = q.o.map((o, k) => {
        const key = keyOf(k);
        return `<div class="s-opt ${key === q.a ? 'ans' : ''}">${key === q.a ? '✓ ' : ''}${key}. ${hl(o, kw)}</div>`;
      }).join('');
      return `<button class="s-item" data-id="${q.id}"><div class="s-title">${hl(q.t, kw)}</div>${opts}</button>`;
    }).join('');
  }

  // ---------- 事件 ----------
  function bind() {
    $('qBox').addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (opt && !opt.disabled) return choose(opt.dataset.key);
      if (e.target.closest('[data-redo]')) return redo();
      const g = e.target.closest('[data-go]');
      if (g) setMode(g.dataset.go);
    });
    $('prevBtn').onclick = () => go(-1);
    $('nextBtn').onclick = () => go(1);
    $('favBtn').onclick = toggleFav;
    $('idxBtn').onclick = () => list.length && openCard(true);
    $('cardClose').onclick = $('cardMask').onclick = () => openCard(false);
    $('cardGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      pos[mode] = +b.dataset.i; save('pos', pos); openCard(false); render(); window.scrollTo(0, 0);
    });

    $('menuBtn').onclick = () => openDrawer(true);
    $('drawerMask').onclick = () => openDrawer(false);
    document.querySelectorAll('.menu [data-mode]').forEach((b) => {
      b.onclick = () => { openDrawer(false); setMode(b.dataset.mode); };
    });
    $('searchOpen').onclick = () => openSearch(true);
    $('searchClose').onclick = () => openSearch(false);
    let st;
    $('searchInput').addEventListener('input', () => { clearTimeout(st); st = setTimeout(doSearch, 200); });
    $('searchList').addEventListener('click', (e) => {
      const it = e.target.closest('[data-id]'); if (!it) return;
      openSearch(false); setMode('seq', +it.dataset.id); window.scrollTo(0, 0);
    });

    $('reshuffle').onclick = () => {
      randOrder = shuffle(Q.map((q) => q.id)); save('randOrder', randOrder); pos.rand = 0; save('pos', pos);
      openDrawer(false); setMode('rand'); toast('已重新打乱');
    };
    $('clearWrong').onclick = () => {
      if (!confirm('确定清空错题本？')) return;
      wrong = []; save('wrong', wrong); openDrawer(false);
      if (mode === 'wrong') setMode('wrong'); else updateStats();
      toast('错题本已清空');
    };
    $('resetAll').onclick = () => {
      if (!confirm('确定重置全部进度？\n作答记录、错题本、练习位置都会清空（收藏保留）。')) return;
      answers = {}; wrong = []; pos = { seq: 0, rand: 0, wrong: 0, fav: 0 }; randOrder = [];
      save('answers', answers); save('wrong', wrong); save('pos', pos); save('randOrder', randOrder);
      openDrawer(false); setMode('seq'); toast('进度已重置');
    };

    // 左右滑动切题
    let sx = 0, sy = 0, st0 = 0;
    const quiz = $('quiz');
    quiz.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st0 = Date.now(); }, { passive: true });
    quiz.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st0 < 600) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    // 桌面端键盘
    document.addEventListener('keydown', (e) => {
      if ($('searchPage').classList.contains('show')) { if (e.key === 'Escape') openSearch(false); return; }
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (/^[a-dA-D1-4]$/.test(e.key)) {
        const k = /\d/.test(e.key) ? keyOf(+e.key - 1) : e.key.toUpperCase();
        const q = byId.get(curId());
        if (q && k.charCodeAt(0) - 65 < q.o.length) choose(k);
      }
    });
  }

  // ---------- 启动 ----------
  async function init() {
    bind();
    try {
      const res = await fetch('questions.json');
      Q = await res.json();
    } catch {
      $('qBox').innerHTML = '<div class="empty"><div class="big">⚠️</div>题库加载失败，请检查网络后刷新</div>';
      return;
    }
    byId = new Map(Q.map((q) => [q.id, q]));
    if (!MODE_NAME[mode]) mode = 'seq';
    setMode(mode);
  }

  init();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

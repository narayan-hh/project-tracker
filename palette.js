/* ==========================================================
   Project Tracker — jump box and keyboard shortcuts
   ----------------------------------------------------------
   Press Ctrl+K (or just / ) and start typing. It searches
   every task, goal, member, reminder and expense you have,
   and also runs the common actions. Enter goes there.
   ========================================================== */

/* ==========================================================
   Everything the box can find
   ========================================================== */
function paletteItems(){
  const out = [];
  const add = (kind, label, sub, run) => out.push({ kind, label, sub, run });

  /* pages */
  add('Page','Home','Overview of everything',        () => location.hash = '#/');
  add('Page','My Tasks','Three priority columns',    () => location.hash = '#/tasks');
  add('Page','Weekly Review','What moved, what slipped', () => location.hash = '#/review');
  add('Page','Team Members','Check-ins and goals',   () => location.hash = '#/team');
  add('Page','Reminders','Pending and overdue',      () => location.hash = '#/reminders');
  add('Page','Budget','Spend by head',               () => location.hash = '#/budget');
  add('Page','Settings','Backups and site details',  () => location.hash = '#/settings');

  /* actions */
  add('Do','New task — Priority 1','', () => quickAddTask(1));
  add('Do','New task — Priority 2','', () => quickAddTask(2));
  add('Do','New task — Priority 3','', () => quickAddTask(3));
  add('Do','New reminder','',          () => runAction('add-reminder', document.body));
  add('Do','New expense','',           () => runAction('add-entry', document.body));
  add('Do','New team member','',       () => runAction('add-person', document.body));
  add('Do','Import a spreadsheet into My Tasks','',  () => openImport('myTasks'));
  add('Do','Import a spreadsheet into Reminders','', () => openImport('reminders'));
  add('Do','Import a spreadsheet into Budget','',    () => openImport('budget'));
  add('Do','Import team members','',                 () => openImport('people'));
  add('Do','Save My Tasks as CSV','',   () => exportSection('myTasks'));
  add('Do','Save Budget as CSV','',      () => exportSection('budget'));
  add('Do','Save all goals as CSV','',   () => exportSection('goals'));
  add('Do','Export a full backup','',    () => runAction('export', document.body));
  add('Do','Show keyboard shortcuts','', () => showShortcuts());

  /* your own data */
  DB.people.forEach(p => {
    add('Member', p.name, p.role, () => location.hash = '#/p/' + p.id);
    p.goals.forEach(g =>
      add('Goal', g.name, p.name + ' · ' + goalStatus(g.status).label,
          () => location.hash = `#/p/${p.id}/g/${g.id}`));
  });

  DB.myTasks.forEach(t =>
    add('Task', t.name, `P${t.priority} · ${t.month} · ${taskStatus(t.status).label}`,
        () => location.hash = '#/tasks'));

  DB.reminders.filter(r => !r.done).forEach(r =>
    add('Reminder', r.title, r.date + (r.who ? ' · ' + r.who : ''),
        () => location.hash = '#/reminders'));

  DB.budget.entries.forEach(e =>
    add('Expense', e.title, `₹${e.amount} · ${e.head}`, () => location.hash = '#/budget'));

  return out;
}

function quickAddTask(pri){
  const t = { id:uid('t'), month:thisMonth(), name:'New task',
    status:'todo', priority:pri, due:'', note:'' };
  DB.myTasks.unshift(t);
  save(); flashId = t.id;
  if(location.hash !== '#/tasks') location.hash = '#/tasks'; else render();
}

/* ==========================================================
   Scoring — so the best match sits at the top
   ========================================================== */
function scoreMatch(item, q){
  const label = item.label.toLowerCase();
  const sub   = (item.sub || '').toLowerCase();
  if(!q) return item.kind === 'Page' ? 5 : item.kind === 'Do' ? 4 : 1;

  if(label === q) return 100;
  if(label.startsWith(q)) return 80;
  if(label.includes(q)) return 60;
  if(sub.includes(q)) return 30;

  /* loose match: do the letters appear in order? */
  let i = 0;
  for(const ch of label){ if(ch === q[i]) i++; if(i === q.length) return 15; }
  return 0;
}

/* ==========================================================
   The box itself
   ========================================================== */
let PAL = { open:false, items:[], shown:[], sel:0 };

function openPalette(seed){
  if(PAL.open) return;
  PAL.open = true;
  PAL.items = paletteItems();
  PAL.sel = 0;

  const wrap = document.createElement('div');
  wrap.className = 'pal-wrap';
  wrap.id = 'pal-wrap';
  wrap.innerHTML = `
    <div class="pal-back"></div>
    <div class="pal" role="dialog" aria-modal="true">
      <div class="pal-top">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.3-4.3"/></svg>
        <input id="pal-q" placeholder="Search tasks, goals, people — or type an action" autocomplete="off" spellcheck="false">
        <kbd>Esc</kbd>
      </div>
      <div class="pal-list" id="pal-list"></div>
      <div class="pal-foot">
        <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> move</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Ctrl</kbd>+<kbd>K</kbd> anytime</span>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));

  const q = document.getElementById('pal-q');
  q.value = seed || '';
  q.oninput = () => drawPalette();
  q.onkeydown = palKey;
  wrap.querySelector('.pal-back').onclick = closePalette;

  drawPalette();
  setTimeout(() => q.focus(), 60);
}

function closePalette(){
  const w = document.getElementById('pal-wrap');
  if(!w) return;
  w.classList.remove('in');
  setTimeout(() => w.remove(), 170);
  PAL.open = false;
}

function drawPalette(){
  const q = (document.getElementById('pal-q').value || '').toLowerCase().trim();

  PAL.shown = PAL.items
    .map(it => ({ it, s: scoreMatch(it, q) }))
    .filter(x => x.s > 0)
    .sort((a,b) => b.s - a.s)
    .slice(0, 40)
    .map(x => x.it);

  if(PAL.sel >= PAL.shown.length) PAL.sel = 0;

  const list = document.getElementById('pal-list');
  if(!PAL.shown.length){
    list.innerHTML = `<div class="pal-empty">Nothing matched “${esc(q)}”.</div>`;
    return;
  }

  list.innerHTML = PAL.shown.map((it,i) => `
    <button class="pal-row ${i===PAL.sel?'on':''}" data-i="${i}">
      <span class="pal-kind k-${it.kind.toLowerCase()}">${esc(it.kind)}</span>
      <span class="pal-label">${esc(it.label)}</span>
      <span class="pal-sub">${esc(it.sub || '')}</span>
    </button>`).join('');

  list.querySelectorAll('.pal-row').forEach(b => {
    b.onmouseenter = () => { PAL.sel = +b.dataset.i; markPalette(); };
    b.onclick = () => runPalette(+b.dataset.i);
  });
}

function markPalette(){
  document.querySelectorAll('.pal-row').forEach((b,i) => b.classList.toggle('on', i === PAL.sel));
}

function palKey(e){
  if(e.key === 'ArrowDown'){ e.preventDefault(); PAL.sel = Math.min(PAL.sel+1, PAL.shown.length-1); markPalette(); scrollPal(); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); PAL.sel = Math.max(PAL.sel-1, 0); markPalette(); scrollPal(); }
  else if(e.key === 'Enter'){ e.preventDefault(); runPalette(PAL.sel); }
  else if(e.key === 'Escape'){ e.preventDefault(); closePalette(); }
}
function scrollPal(){
  const on = document.querySelector('.pal-row.on');
  if(on) on.scrollIntoView({ block:'nearest' });
}
function runPalette(i){
  const it = PAL.shown[i];
  if(!it) return;
  closePalette();
  setTimeout(() => it.run(), 60);
}

/* ==========================================================
   Shortcuts
   ========================================================== */
const typing = el => el && (el.isContentEditable ||
  /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

let gPressed = false;

document.addEventListener('keydown', e => {
  /* Ctrl+K works even while typing */
  if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
    e.preventDefault();
    PAL.open ? closePalette() : openPalette();
    return;
  }
  if(PAL.open) return;
  if(typing(document.activeElement)) return;
  if(document.getElementById('modal-wrap')) return;

  /* / opens the same box */
  if(e.key === '/'){ e.preventDefault(); openPalette(); return; }
  if(e.key === '?'){ e.preventDefault(); showShortcuts(); return; }

  /* g then a letter jumps somewhere */
  if(gPressed){
    gPressed = false;
    const to = { h:'#/', t:'#/tasks', w:'#/review', m:'#/team',
                 r:'#/reminders', b:'#/budget', s:'#/settings' }[e.key.toLowerCase()];
    if(to){ e.preventDefault(); location.hash = to; }
    return;
  }
  if(e.key === 'g'){ gPressed = true; setTimeout(() => gPressed = false, 900); return; }

  /* n makes a new thing on whichever page you are on */
  if(e.key === 'n'){
    e.preventDefault();
    const h = location.hash || '#/';
    if(h.startsWith('#/reminders')) runAction('add-reminder', document.body);
    else if(h.startsWith('#/budget')) runAction('add-entry', document.body);
    else if(h.startsWith('#/team')) runAction('add-person', document.body);
    else quickAddTask(1);
    return;
  }

  /* i opens the import window for this page */
  if(e.key === 'i'){ e.preventDefault(); importForThisPage(); return; }
});

/* which section is on screen right now? */
function importForThisPage(){
  const h = (location.hash || '#/').slice(2).split('/').filter(Boolean);
  if(h[0] === 'reminders') return openImport('reminders');
  if(h[0] === 'budget')    return openImport('budget');
  if(h[0] === 'team')      return openImport('people');
  if(h[0] === 'p' && h[2] === 'g') return openImport('subtasks', h[1], h[3]);
  if(h[0] === 'p')         return openImport('goals', h[1]);
  return openImport('myTasks');
}

function showShortcuts(){
  const row = (k,d) => `<div class="sc-row"><kbd>${k}</kbd><span>${d}</span></div>`;
  openModal('Keyboard shortcuts', `
    <div class="sc-grid">
      ${row('Ctrl + K','Open the jump box')}
      ${row('/','Same jump box')}
      ${row('n','New item on this page')}
      ${row('i','Import a spreadsheet into this page')}
      ${row('g then h','Home')}
      ${row('g then t','My Tasks')}
      ${row('g then w','Weekly Review')}
      ${row('g then m','Team Members')}
      ${row('g then r','Reminders')}
      ${row('g then b','Budget')}
      ${row('g then s','Settings')}
      ${row('Esc','Close whatever is open')}
      ${row('?','This list')}
    </div>`);
}

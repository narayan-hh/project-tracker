/* ==========================================================
   Project Tracker — router, actions, start-up
   ========================================================== */

/* ==========================================================
   Warning banner when saving is not working
   ========================================================== */
function showStorageWarning(){
  if(document.getElementById('warnbar')) return;
  const bar = document.createElement('div');
  bar.id = 'warnbar';
  bar.className = 'warnbar';
  bar.innerHTML = `
    <span class="wb-icon">&#9888;</span>
    <div class="wb-text">
      <b>Your changes are NOT being saved.</b>
      This browser is blocking storage for files opened from disk, so anything you type
      will be lost when you close the tab. Use <b>Settings &rarr; Export backup</b> before
      you leave, or open this site in Chrome or Edge instead.
    </div>
    <button class="wb-x" onclick="document.getElementById('warnbar').remove()">&times;</button>`;
  document.body.appendChild(bar);
  document.body.classList.add('has-warn');
}

/* ==========================================================
   If anything goes wrong, say so on screen rather than
   failing silently in a console nobody has open.
   ========================================================== */
function showErrorBar(msg){
  let bar = document.getElementById('errbar');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'errbar';
    bar.className = 'errbar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span class="wb-icon">&#9888;</span>
    <div class="wb-text"><b>Something went wrong.</b> ${esc(msg)}
    <br>Your saved data is safe. Please tell me this message.</div>
    <button class="wb-x" onclick="this.parentNode.remove()">&times;</button>`;
}
window.addEventListener('error', ev => {
  showErrorBar((ev.message || 'Unknown error') + '  —  ' +
    String(ev.filename || '').split('/').pop() + ' line ' + ev.lineno);
});

/* ==========================================================
   Sidebar
   ========================================================== */
const NAV = [
  { href:'#/',          label:'Home',         icon:'M3 11l9-8 9 8M5 10v10h14V10' },
  { href:'#/tasks',     label:'My Tasks',     icon:'M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { href:'#/team',      label:'Team Members', icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .1M23 21v-2a4 4 0 0 0-3-3.9' },
  { href:'#/reminders', label:'Reminders',    icon:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0' },
  { href:'#/budget',    label:'Budget',       icon:'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' }
];

function renderSidebar(){
  const hash = location.hash || '#/';
  const isOn = href => href === '#/' ? (hash === '#/' || hash === '') : hash.startsWith(href);

  const link = n => `
    <a class="sb-link ${isOn(n.href)?'active':''}" href="${n.href}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${n.icon}"/></svg>
      ${n.label}
    </a>`;

  document.getElementById('sidebar').innerHTML = `
    <div class="sb-head">
      <h2>${esc(DB.meta.title)}</h2>
      <p>${esc(theLead().name)}</p>
    </div>
    <nav class="sb-nav">
      ${NAV.map(link).join('')}
    </nav>
    <div class="sb-foot">
      <a class="sb-link ${isOn('#/settings')?'active':''}" href="#/settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/></svg>
        Settings
      </a>
    </div>`;
}

const isNarrow = () => window.matchMedia('(max-width:1024px)').matches;
function toggleMenu(){
  if(isNarrow()){
    const open = !document.getElementById('sidebar').classList.contains('open');
    document.getElementById('sidebar').classList.toggle('open', open);
    document.getElementById('scrim').classList.toggle('open', open);
  } else {
    document.body.classList.toggle('rail-hidden');
  }
}
function closeMenu(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('scrim').classList.remove('open');
}

/* id of a record that was just created, so render can highlight it */
let flashId = null;

/* ==========================================================
   Router
   ========================================================== */
function render(){
  const view = document.getElementById('view');
  const h = (location.hash || '#/').slice(2).split('/').filter(Boolean);
  let html;

  if(h.length === 0)                       html = viewHome();
  else if(h[0] === 'tasks')                html = viewTasks();
  else if(h[0] === 'team')                 html = viewTeam();
  else if(h[0] === 'reminders')            html = viewReminders();
  else if(h[0] === 'budget')               html = viewBudget();
  else if(h[0] === 'settings')             html = viewSettings();
  else if(h[0] === 'p' && h[2] === 'g')    html = viewGoal(h[1], h[3]);
  else if(h[0] === 'p' && h.length === 2)  html = viewPerson(h[1]);
  else                                     html = viewHome();

  view.className = 'view';
  view.innerHTML = html;
  renderSidebar();

  const now = location.hash || '#/';
  if(now !== render._last){ render._last = now; view.scrollTop = 0; }

  /* make a freshly added row obvious, wherever the sorting put it */
  if(flashId){
    const el = view.querySelector(
      `[data-rem="${flashId}"],[data-entry="${flashId}"],[data-task="${flashId}"],[data-goal="${flashId}"]`);
    if(el){
      el.classList.add('flash');
      el.scrollIntoView({ block:'center', behavior:'smooth' });
    }
    flashId = null;
  }

  bindActions(view);

  /* the sky title only belongs on the home page */
  const onHome = (location.hash || '#/') === '#/';
  document.body.classList.toggle('home', onHome);
  const skyH = document.getElementById('sky-h1');
  const skyP = document.getElementById('sky-sub');
  if(skyH) skyH.textContent = DB.meta.title || 'Project Tracker';
  if(skyP) skyP.textContent = DB.meta.tagline || '';

  if(h[0] === 'settings') wireImport();
}

function go(hash){
  const view = document.getElementById('view');
  view.classList.add('view-out');
  setTimeout(() => {
    if((location.hash || '#/') === hash) render();
    else location.hash = hash;
  }, 150);
}

/* ==========================================================
   Editing
   ========================================================== */
document.addEventListener('focusout', e => {
  const el = e.target.closest && e.target.closest('[data-edit]');
  if(!el) return;
  const path = el.dataset.edit;

  /* budget heads are a plain array of strings: "budget.heads.2" */
  const m = path.match(/^budget\.heads\.(\d+)$/);
  if(m){ DB.budget.heads[+m[1]] = el.textContent.trim(); }
  else  { setPath(path, el.textContent.trim(), el.dataset.num === '1'); }

  save();
  renderSidebar();
});

document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('[data-edit]');
  if(el && e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); el.blur(); }
  if(e.key === 'Escape') closeMenu();
});

/* which person / goal are we on? */
function ctx(){
  const h = (location.hash || '#/').slice(2).split('/').filter(Boolean);
  return { pid: h[1], gid: h[3] };
}

/* ==========================================================
   Actions
   ========================================================== */
/* Every button is wired directly by bindActions() after each render,
   and this document-level listener stays as a safety net for anything
   that was not bound. Direct handlers stop propagation so nothing runs twice. */
document.addEventListener('click', e => {

  /* arrow buttons inside cards */
  const goBtn = e.target.closest('.go-btn');
  if(goBtn){
    const gcard = goBtn.closest('[data-goal]');
    if(gcard){ go(`#/p/${ctx().pid}/g/${gcard.dataset.goal}`); return; }
    const link = goBtn.closest('a[href]');
    if(link){ go(link.getAttribute('href')); e.preventDefault(); return; }
  }

  const act = e.target.closest('[data-act]');
  if(!act) return;
  runAction(act.dataset.act, act);
});

/* attach a real click handler to every button on the page */
function bindActions(root){
  root.querySelectorAll('[data-act]').forEach(el => {
    if(el.tagName === 'SELECT') return;            /* selects use 'change' */
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      if(el.tagName !== 'INPUT') ev.preventDefault();  /* let checkboxes toggle */
      runAction(el.dataset.act, el);
    });
  });

  root.querySelectorAll('.go-btn').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation(); ev.preventDefault();
      const gcard = btn.closest('[data-goal]');
      if(gcard){ go(`#/p/${ctx().pid}/g/${gcard.dataset.goal}`); return; }
      const link = btn.closest('a[href]');
      if(link) go(link.getAttribute('href'));
    });
  });
}

function runAction(a, act){
  if(!a) return;
  const { pid, gid } = ctx();

  /* ---------- my tasks ---------- */
  if(a === 'add-task'){
    const t = { id:uid('t'), month:thisMonth(), name:'New task',
      status:'todo', priority:Number(act.dataset.pri) || 1 };
    DB.myTasks.unshift(t);
    save(); flashId = t.id;
    if(location.hash !== '#/tasks') go('#/tasks'); else render();
    return;
  }
  if(a === 'del-task'){
    const id = act.closest('[data-task]').dataset.task;
    DB.myTasks = DB.myTasks.filter(t => t.id !== id);
    save(); render(); return;
  }

  /* ---------- people ---------- */
  if(a === 'add-person'){
    const used = DB.people.map(p => p.palette);
    let pal = (used.length % 6) + 1;
    for(let i=1;i<=6;i++){ if(!used.includes(i)){ pal = i; break; } }
    const p = blankPerson('New member', pal);
    DB.people.push(p); save();
    go('#/p/' + p.id);           /* their page opens with the name ready to edit */
    return;
  }
  if(a === 'del-person'){
    if(!confirm('Remove this member and everything recorded about them?')) return;
    DB.people = DB.people.filter(p => p.id !== act.dataset.p);
    save(); go('#/team'); return;
  }

  /* ---------- check-ins ---------- */
  if(a === 'complete-checkin'){
    const p = person(pid);
    const c = p.checkins.find(x => x.id === act.dataset.c);
    c.done = true;
    p.checkins.push(blankCheckin());
    save(); render(); return;
  }
  if(a === 'reopen-checkin'){
    const p = person(pid);
    p.checkins.forEach(x => { if(!x.done && x.id !== act.dataset.c) x.done = true; });
    p.checkins.find(x => x.id === act.dataset.c).done = false;
    save(); render(); return;
  }
  if(a === 'del-checkin'){
    if(!confirm('Delete this check-in record?')) return;
    const p = person(pid);
    p.checkins = p.checkins.filter(x => x.id !== act.dataset.c);
    if(!p.checkins.some(x => !x.done)) p.checkins.push(blankCheckin());
    save(); render(); return;
  }

  /* ---------- wins / concerns ---------- */
  if(a === 'add-wins' || a === 'add-concerns'){
    const kind = a === 'add-wins' ? 'wins' : 'concerns';
    person(pid)[kind].unshift({ id:uid('n'), date:today(), text:'' });
    save(); render(); return;
  }
  if(a === 'del-wins' || a === 'del-concerns'){
    const kind = a === 'del-wins' ? 'wins' : 'concerns';
    const id = act.closest('[data-item]').dataset.item;
    const p = person(pid);
    p[kind] = p[kind].filter(x => x.id !== id);
    save(); render(); return;
  }

  /* ---------- goals ---------- */
  if(a === 'add-goal'){
    const target = act.dataset.p;
    const g = blankGoal();
    person(target).goals.push(g);
    save(); flashId = g.id;
    if(location.hash !== '#/p/' + target) go('#/p/' + target); else render();
    return;
  }
  if(a === 'del-goal'){
    if(!confirm('Delete this goal? This cannot be undone.')) return;
    const p = person(pid);
    p.goals = p.goals.filter(g => g.id !== gid);
    save(); go('#/p/' + pid); return;
  }
  if(a === 'import-goals'){ go('#/settings'); return; }

  if(a === 'add-sub'){
    goalOf(person(pid), gid).subtasks.push({ id:uid('s'), text:'New subtask', done:false });
    save(); render(); return;
  }
  if(a === 'del-sub'){
    const g = goalOf(person(pid), gid);
    g.subtasks = g.subtasks.filter(s => s.id !== act.closest('[data-sub]').dataset.sub);
    save(); render(); return;
  }
  if(a === 'toggle-sub'){
    const g = goalOf(person(pid), gid);
    const s = g.subtasks.find(x => x.id === act.closest('[data-sub]').dataset.sub);
    s.done = act.checked; save(); render(); return;
  }
  if(a === 'add-comment'){
    goalOf(person(pid), gid).comments.push({ id:uid('c'), date:today(), text:'' });
    save(); render(); return;
  }
  if(a === 'del-comment'){
    const g = goalOf(person(pid), gid);
    g.comments = g.comments.filter(c => c.id !== act.closest('[data-comment]').dataset.comment);
    save(); render(); return;
  }

  /* ---------- reminders ---------- */
  if(a === 'add-reminder'){
    const r = { id:uid('r'), date:today(), title:'New reminder',
      who:'', note:'', done:false };
    DB.reminders.unshift(r);
    save(); flashId = r.id;
    if(location.hash !== '#/reminders') go('#/reminders'); else render();
    return;
  }
  if(a === 'del-reminder'){
    const id = act.closest('[data-rem]').dataset.rem;
    DB.reminders = DB.reminders.filter(r => r.id !== id);
    save(); render(); return;
  }
  if(a === 'toggle-reminder'){
    const id = act.closest('[data-rem]').dataset.rem;
    DB.reminders.find(r => r.id === id).done = act.checked;
    save(); render(); return;
  }

  /* ---------- budget ---------- */
  if(a === 'add-entry'){
    const b = { id:uid('b'), date:today(), title:'New expense',
      amount:0, by:'', head:DB.budget.heads[0] || 'Other' };
    DB.budget.entries.unshift(b);
    save(); flashId = b.id;
    if(location.hash !== '#/budget') go('#/budget'); else render();
    return;
  }
  if(a === 'del-entry'){
    const id = act.closest('[data-entry]').dataset.entry;
    DB.budget.entries = DB.budget.entries.filter(x => x.id !== id);
    save(); render(); return;
  }
  if(a === 'add-head'){
    DB.budget.heads.push('New head');
    save(); render();
    return;
  }
  if(a === 'del-head'){
    DB.budget.heads.splice(+act.dataset.i, 1);
    save(); render(); return;
  }

  /* ---------- backup ---------- */
  if(a === 'export'){
    const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project-tracker-backup-' + today() + '.json';
    link.click(); URL.revokeObjectURL(url);
    return;
  }
  if(a === 'import-json'){
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        try{ DB = JSON.parse(r.result); normalise(); save(); render(); alert('Backup restored.'); }
        catch(err){ alert('That file could not be read.'); }
      };
      r.readAsText(f);
    };
    inp.click();
    return;
  }
  if(a === 'reset'){
    if(confirm('Reset everything back to the starting content? All your entries will be lost.')){
      DB = seed(); save(); go('#/');
    }
    return;
  }

  /* ---------- spreadsheet import ---------- */
  if(a === 'imp-preview'){ doImport(false); return; }
  if(a === 'imp-apply')  { doImport(true);  return; }

  /* ---------- diagnostics ---------- */
  if(a === 'selftest'){
    const out = document.getElementById('selftest-out');
    const store = storageWorks() ? 'working' : 'BLOCKED by this browser';
    out.innerHTML = `<p class="ok-inline">
      Buttons are working. Storage is ${store}.
      ${DB.people.length} people, ${DB.myTasks.length} tasks,
      ${DB.reminders.length} reminders, ${DB.budget.entries.length} budget entries saved.</p>`;
    return;
  }
}

/* dropdowns */
document.addEventListener('change', e => {
  const el = e.target;
  if(el.matches('[data-act="set-field"]') || el.matches('[data-act="set-task-status"]')){
    setPath(el.dataset.path, el.value, el.dataset.num === '1');
    save(); render(); return;
  }
  if(el.matches('[data-act="set-goal-status"]')){
    setPath(el.dataset.path, el.value);
    save(); render(); return;
  }
  if(el.id === 'imp-target'){
    document.getElementById('imp-person').style.display = el.value === 'goals' ? '' : 'none';
  }
});

/* ==========================================================
   Spreadsheet import
   ========================================================== */
let impText = '';

function wireImport(){
  const target = document.getElementById('imp-target');
  const pick   = document.getElementById('imp-person');
  const file   = document.getElementById('imp-file');
  if(!target) return;
  pick.style.display = target.value === 'goals' ? '' : 'none';
  impText = '';
  file.addEventListener('change', () => {
    const f = file.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      impText = r.result;
      document.getElementById('imp-text').value = impText.slice(0, 4000);
      doImport(false);
    };
    r.readAsText(f);
  });
}

function doImport(apply){
  const target = document.getElementById('imp-target').value;
  const pid    = document.getElementById('imp-person').value;
  const text   = (document.getElementById('imp-text').value || impText || '').trim();
  const out    = document.getElementById('imp-preview');

  if(!text){ out.innerHTML = `<p class="muted">Nothing to read yet — choose a file or paste some rows.</p>`; return; }

  const rows  = parseTable(text);
  const built = buildImport(rows, target, pid);

  if(built.error || !built.records.length){
    out.innerHTML = `<p class="warn-inline">${esc(built.error || 'No usable rows were found. Check that the first row holds your column headings.')}</p>`;
    return;
  }

  if(apply){
    const n = applyImport(built);
    out.innerHTML = `<p class="ok-inline">Imported ${n} row${n===1?'':'s'}.</p>`;
    document.getElementById('imp-text').value = '';
    impText = '';
    setTimeout(() => {
      go(target === 'myTasks' ? '#/tasks'
        : target === 'reminders' ? '#/reminders'
        : target === 'budget' ? '#/budget'
        : '#/p/' + pid);
    }, 700);
    return;
  }

  /* preview */
  const matched = Object.keys(built.map).map(k => `<span class="status">${k} &rarr; column ${built.map[k]+1}</span>`).join(' ');
  const sample = built.records.slice(0,6).map(r => `
    <tr>${Object.keys(r).filter(k => k !== 'id').map(k =>
      `<td>${esc(typeof r[k] === 'object' ? '' : r[k])}</td>`).join('')}</tr>`).join('');
  const cols = Object.keys(built.records[0]).filter(k => k !== 'id');

  out.innerHTML = `
    <div class="field">
      <label>Columns recognised</label>
      <div class="row">${matched || '<span class="muted">none — using the first column as the title</span>'}</div>
    </div>
    <div class="field">
      <label>Preview &mdash; ${built.records.length} row${built.records.length===1?'':'s'} ready</label>
      <div class="table-wrap">
        <table class="grid-table">
          <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${sample}</tbody>
        </table>
      </div>
      ${built.records.length > 6 ? `<p class="muted">…and ${built.records.length-6} more.</p>` : ''}
    </div>`;
}

/* ==========================================================
   Start up
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('burger').addEventListener('click', toggleMenu);
  document.getElementById('scrim').addEventListener('click', closeMenu);
  document.getElementById('sidebar').addEventListener('click', e => {
    if(e.target.closest('.sb-link') && isNarrow()) closeMenu();
  });

  /* fade the sky title away once the page is scrolled */
  const view = document.getElementById('view');
  view.addEventListener('scroll', () => {
    document.body.classList.toggle('scrolled', view.scrollTop > 40);
  }, { passive:true });

  load();
  if(!STORAGE_OK) showStorageWarning();
  render();
});

window.addEventListener('hashchange', render);

/* ==========================================================
   Project Tracker — Weekly Review
   ----------------------------------------------------------
   The page a programme manager actually needs on a Monday:
   what moved, what slipped, who needs a conversation, and
   what is due next. All worked out from what is already
   recorded — nothing extra to fill in.
   ========================================================== */

/* ---------- dates ---------- */
const dayMs = 86400000;
function daysAgo(dateStr){
  if(!dateStr) return null;
  const t = Date.parse(dateStr);
  if(isNaN(t)) return null;
  return Math.floor((Date.now() - t) / dayMs);
}
function daysAhead(dateStr){
  const d = daysAgo(dateStr);
  return d === null ? null : -d;
}
const STALE_DAYS = 14;

/* ==========================================================
   Work out what needs attention
   ========================================================== */
function insights(){
  const now = today();

  const openTasks = DB.myTasks.filter(t => t.status !== 'done');

  const overdue = openTasks
    .filter(t => t.due && t.due < now)
    .sort((a,b) => String(a.due).localeCompare(String(b.due)));

  const dueThisWeek = openTasks.filter(t => {
    const d = daysAhead(t.due);
    return d !== null && d >= 0 && d <= 7;
  }).sort((a,b) => String(a.due).localeCompare(String(b.due)));

  const noDate = openTasks.filter(t => !t.due);

  const doneThisWeek = DB.myTasks.filter(t => {
    if(t.status !== 'done') return false;
    const d = daysAgo(t.doneAt);
    return d !== null && d <= 7;
  });

  /* reminders */
  const remOverdue = DB.reminders.filter(r => !r.done && r.date && r.date < now)
    .sort((a,b) => String(a.date).localeCompare(String(b.date)));
  const remSoon = DB.reminders.filter(r => {
    if(r.done) return false;
    const d = daysAhead(r.date);
    return d !== null && d >= 0 && d <= 7;
  }).sort((a,b) => String(a.date).localeCompare(String(b.date)));

  /* goals that are not in a good place */
  const atRisk = [];
  const notBrokenDown = [];
  DB.people.forEach(p => p.goals.forEach(g => {
    if(g.status === 'risk' || g.status === 'hold') atRisk.push({ p, g });
    if(!g.subtasks.length && g.status !== 'done') notBrokenDown.push({ p, g });
  }));

  /* people who have not had a check-in in a while */
  const stale = [];
  teamOnly().forEach(p => {
    const filed = p.checkins.filter(c => c.done);
    const last = filed.length ? filed[filed.length-1].date : null;
    const age = daysAgo(last);
    if(age === null || age >= STALE_DAYS) stale.push({ p, last, age });
  });

  /* budget: this month against last */
  const ym = s => String(s || '').slice(0,7);
  const thisYm = new Date().toISOString().slice(0,7);
  const lastDate = new Date(); lastDate.setMonth(lastDate.getMonth() - 1);
  const lastYm = lastDate.toISOString().slice(0,7);
  const sum = key => DB.budget.entries
    .filter(e => ym(e.date) === key)
    .reduce((n,e) => n + (Number(e.amount)||0), 0);

  return {
    overdue, dueThisWeek, noDate, doneThisWeek,
    remOverdue, remSoon, atRisk, notBrokenDown, stale,
    spendThisMonth: sum(thisYm), spendLastMonth: sum(lastYm),
    openTasks: openTasks.length
  };
}

/* how many things need a look right now? drives the sidebar badge */
function attentionCount(){
  const i = insights();
  return i.overdue.length + i.remOverdue.length + i.atRisk.length + i.stale.length;
}

/* ==========================================================
   The page
   ========================================================== */
function viewReview(){
  const i = insights();
  const money = n => '₹' + (Number(n)||0).toLocaleString('en-IN');
  const diff = i.spendThisMonth - i.spendLastMonth;

  /* a block of rows, or a calm line when there is nothing to do */
  const block = (title, note, items, draw, tone) => `
    <div class="panel reveal rv ${tone||''}">
      <div class="section-head" style="margin:0 0 10px">
        <h2>${title}</h2>
        <span class="rv-count ${items.length?'':'zero'}">${items.length}</span>
        <span class="spacer"></span>
        <span class="muted">${note}</span>
      </div>
      ${items.length ? items.map(draw).join('') : `<p class="rv-clear">All clear here.</p>`}
    </div>`;

  const taskRow = t => `
    <div class="mini-row">
      <span class="dot ${taskStatus(t.status).cls}"></span>
      <span class="t">${esc(t.name)}</span>
      <span class="m">${t.due ? esc(t.due) : esc(t.month)}</span>
      <span class="status s-plan">P${t.priority}</span>
    </div>`;

  const remRow = r => `
    <div class="mini-row">
      <span class="dot s-risk"></span>
      <span class="t">${esc(r.title)}</span>
      <span class="m">${esc(r.date)}</span>
      ${r.who ? `<span class="status">${esc(r.who)}</span>` : ''}
    </div>`;

  const goalRow = x => `
    <a class="mini-row link" href="#/p/${x.p.id}/g/${x.g.id}">
      <span class="dot ${goalStatus(x.g.status).cls}"></span>
      <span class="t">${esc(x.g.name)}</span>
      <span class="m">${esc(x.p.name)}</span>
      ${chip(goalStatus(x.g.status))}
    </a>`;

  const staleRow = x => `
    <a class="mini-row link" href="#/p/${x.p.id}">
      <span class="dot s-hold"></span>
      <span class="t">${esc(x.p.name)}</span>
      <span class="m">${x.last ? esc(x.last) : 'never'}</span>
      <span class="status s-risk">${x.age === null ? 'no check-in yet' : x.age + ' days ago'}</span>
    </a>`;

  return `
  <div class="page t-review">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>Weekly Review</h1>
        <p class="sub">${i.doneThisWeek.length} finished this week &middot; ${attentionCount()} things need a look</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="copy-review">Copy this review</button>
      <button class="btn" data-act="print-review">Print / save as PDF</button>
      <span class="spacer"></span>
      <button class="btn" data-act="open-import" data-target="myTasks">Import tasks</button>`)}

    <div class="tiles">
      <div class="tile ${i.overdue.length?'bad':''}"><b>${i.overdue.length}</b><span>Overdue tasks</span></div>
      <div class="tile"><b>${i.dueThisWeek.length}</b><span>Due in 7 days</span></div>
      <div class="tile ${i.doneThisWeek.length?'good':''}"><b>${i.doneThisWeek.length}</b><span>Finished this week</span></div>
      <div class="tile"><b>${money(i.spendThisMonth)}</b><span>Spent this month</span>
        <em>${diff === 0 ? 'same as last month'
             : diff > 0 ? money(diff) + ' more than last month'
             : money(-diff) + ' less than last month'}</em></div>
    </div>

    <div class="rv-grid">
      ${block('Overdue', 'past their due date', i.overdue, taskRow, 'bad')}
      ${block('Due this week', 'next 7 days', i.dueThisWeek, taskRow)}
      ${block('Finished this week', 'well done', i.doneThisWeek, taskRow, 'good')}
      ${block('Overdue reminders', 'chase these', i.remOverdue, remRow, 'bad')}
      ${block('Reminders coming up', 'next 7 days', i.remSoon, remRow)}
      ${block('Goals needing attention', 'at risk or on hold', i.atRisk, goalRow, 'bad')}
      ${block('People to check in with', 'no check-in in ' + STALE_DAYS + '+ days', i.stale, staleRow, 'warn')}
      ${block('Goals with no subtasks', 'not broken down yet', i.notBrokenDown, goalRow, 'warn')}
      ${block('Tasks with no due date', 'add a date so they show up above', i.noDate, taskRow, 'warn')}
    </div>

    <div class="foot">Worked out from what you have recorded &middot; nothing to fill in here</div>
  </div>`;
}

/* ==========================================================
   Copy the review as plain text, ready to paste into an
   email or a message.
   ========================================================== */
function reviewText(){
  const i = insights();
  const L = [];
  const list = (title, items, line) => {
    if(!items.length) return;
    L.push('');
    L.push(title.toUpperCase());
    items.forEach(x => L.push('  - ' + line(x)));
  };

  L.push(`WEEKLY REVIEW — ${today()}`);
  L.push(`${theLead().name}, ${theLead().role}`);
  L.push('');
  L.push(`Open tasks: ${i.openTasks}   Overdue: ${i.overdue.length}   Finished this week: ${i.doneThisWeek.length}`);
  L.push(`Spent this month: ₹${i.spendThisMonth.toLocaleString('en-IN')}`);

  list('Finished this week', i.doneThisWeek, t => `${t.name} (P${t.priority})`);
  list('Overdue', i.overdue, t => `${t.name} — due ${t.due}`);
  list('Due in the next 7 days', i.dueThisWeek, t => `${t.name} — due ${t.due}`);
  list('Overdue reminders', i.remOverdue, r => `${r.title} — ${r.date}${r.who ? ' (' + r.who + ')' : ''}`);
  list('Goals needing attention', i.atRisk, x => `${x.g.name} — ${x.p.name} (${goalStatus(x.g.status).label})`);
  list('People to check in with', i.stale, x => `${x.p.name} — last check-in ${x.last || 'never'}`);

  return L.join('\n');
}

function copyReview(){
  const text = reviewText();
  const done = () => toast('Review copied — paste it anywhere');

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(() => fallback());
  } else fallback();

  function fallback(){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); done(); }
    catch(e){ toast('Could not copy — the text is shown instead', {kind:'warn'});
              openModal('Weekly review', `<pre class="rv-pre">${esc(text)}</pre>`, {wide:true}); }
    ta.remove();
  }
}

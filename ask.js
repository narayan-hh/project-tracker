/* ==========================================================
   My Workstation — Ask
   ----------------------------------------------------------
   One box you can put a plain question to, and it answers from
   what is already in the tracker.

   Worth being straight about how this works: there is no model
   and no internet connection behind it. The site is a folder of
   files on your machine and nothing leaves it. What this does is
   read your question for the things it can recognise — a topic
   (tasks, reminders, goals, budget, people), a filter (overdue,
   due this week, at risk, completed, a priority, a month) and a
   person's name — and then answers from your own records. If it
   recognises nothing it falls back to searching everything and
   showing what matched.

   That covers the questions this tracker actually gets asked.
   It will not hold a conversation.
   ========================================================== */

/* ---------- small helpers ---------- */
const askHas = (q, re) => re.test(q);
const askMoney = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');

/* the words people use for each part of the tracker */
const ASK_TOPIC = [
  ['tasks',     /\btasks?\b|\bto.?dos?\b|\bwork\b/],
  ['reminders', /\bremind/],
  ['goals',     /\bgoals?\b|\bobjectives?\b|\bsubtasks?\b/],
  ['budget',    /\bspend|\bspent\b|\bbudget|\bcost|\bexpense|\bmoney\b|\bpaid\b|\bamount|\brupee|₹|\bvendor/],
  ['people',    /\bteam\b|\bmembers?\b|\bpeople\b|\bstaff\b|\bcolleag/],
  ['checkins',  /check.?ins?\b|\b1.?1\b|\bone.?on.?one/]
];

const ASK_FILTER = {
  overdue : /\boverdue\b|\blate\b|past due|\bslipped\b|\bmissed\b|\bbehind\b/,
  soon    : /\bdue\b|this week|next week|\bupcoming\b|coming up|\bsoon\b|next 7|\bdeadline/,
  today   : /\btoday\b|\bnow\b/,
  done    : /\bdone\b|\bcompleted?\b|\bfinished\b|\bclosed\b|\bachieved\b/,
  risk    : /\brisk\b|\battention\b|\bblocked\b|\bstuck\b|\bon hold\b|\bproblem|\bconcern|\bworr/,
  open    : /\bopen\b|\bpending\b|\boutstanding\b|\bremaining\b|\bleft\b|\bnot started\b|\bunfinished\b/,
  stale   : /not been|no check|haven.?t|hasn.?t|\bstale\b|\boverlooked\b|\bneglect/,
  count   : /how many|\bcount\b|number of|how much/,
  top     : /\btop\b|\bbiggest\b|\blargest\b|\bmost\b|\bhighest\b|\bmax/
};

/* ==========================================================
   Reading the question
   ========================================================== */
function askRead(q){
  const read = {
    topics: ASK_TOPIC.filter(([, re]) => re.test(q)).map(([name]) => name),
    filters: {},
    priority: null,
    month: null,
    person: null,
    words: q.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)
  };

  Object.keys(ASK_FILTER).forEach(k => { if(ASK_FILTER[k].test(q)) read.filters[k] = true; });

  const pri = q.match(/priorit\w*\s*([123])/) || q.match(/\bp\s?([123])\b/);
  if(pri) read.priority = Number(pri[1]);

  const mon = MONTHS.find(m => q.includes(m.toLowerCase()));
  if(mon) read.month = mon;

  /* a person is named if their full name, or the first part of it,
     shows up as a whole word */
  read.person = DB.people.find(p => {
    const full  = p.name.toLowerCase();
    const first = full.split(/\s+/)[0];
    return q.includes(full) ||
           (first.length > 2 && new RegExp('\\b' + first + '\\b').test(q));
  }) || null;

  return read;
}

/* ==========================================================
   Turning records into rows the panel can show
   ========================================================== */
const askTaskRow = t => ({
  kind: 'Task',
  title: t.name,
  sub: [ 'Priority ' + t.priority, t.month, taskStatus(t.status).label,
         t.due ? 'due ' + t.due : '' ].filter(Boolean).join(' · '),
  href: '#/tasks'
});
const askRemRow = r => ({
  kind: 'Reminder',
  title: r.title,
  sub: [ r.date, r.who, r.done ? 'done' : '' ].filter(Boolean).join(' · '),
  href: '#/reminders'
});
const askGoalRow = (p, g) => ({
  kind: 'Goal',
  title: g.name,
  sub: [ p.name, goalStatus(g.status).label, g.timeline,
         g.subtasks.length ? g.subtasks.filter(s => s.done).length + '/' + g.subtasks.length + ' subtasks' : 'no subtasks'
       ].filter(Boolean).join(' · '),
  href: `#/p/${p.id}/g/${g.id}`
});
const askEntryRow = e => ({
  kind: 'Expense',
  title: e.title,
  sub: [ askMoney(e.amount), e.head, e.date, e.vendor ].filter(Boolean).join(' · '),
  href: '#/budget'
});
const askPersonRow = p => {
  const pr = progressOf(p);
  return {
    kind: 'Member',
    title: p.name,
    sub: [ p.role, p.goals.length + ' goals', pr.pct + '% done' ].filter(Boolean).join(' · '),
    href: '#/p/' + p.id
  };
};

/* ==========================================================
   The answer
   ========================================================== */
function askAnswer(raw){
  const q = String(raw || '').toLowerCase().trim();
  if(!q) return null;

  const r = askRead(q);
  const i = insights();
  const now = today();
  const groups = [];
  const stats  = [];
  let title = '';
  let note  = '';

  const wantsAll = !r.topics.length;
  const wants = t => r.topics.includes(t) || wantsAll;
  const f = r.filters;

  /* how a person narrows things down */
  const mine  = t => !r.person || r.person.lead;          /* my tasks belong to the lead */
  const pgoals = p => p.goals;

  /* ---------- money ---------- */
  if(r.topics.includes('budget')){
    let list = DB.budget.entries.slice();
    if(r.month){
      const ix = MONTHS.indexOf(r.month) + 1;
      list = list.filter(e => Number(String(e.date).slice(5,7)) === ix);
    }
    if(r.person) list = list.filter(e =>
      (e.by || '').toLowerCase().includes(r.person.name.toLowerCase().split(/\s+/)[0]));

    const total = list.reduce((n,e) => n + (Number(e.amount)||0), 0);
    const byHead = {};
    list.forEach(e => { byHead[e.head || 'Other'] = (byHead[e.head||'Other']||0) + (Number(e.amount)||0); });
    const heads = Object.keys(byHead).sort((a,b) => byHead[b] - byHead[a]);

    title = r.month ? `Spending in ${r.month}` : 'Spending';
    stats.push({ n: askMoney(total), label: 'total' });
    stats.push({ n: list.length, label: 'entries' });
    stats.push({ n: askMoney(i.spendThisMonth), label: 'this month' });

    if(heads.length) groups.push({
      label: 'By head',
      rows: heads.map(h => ({ kind:'Head', title:h, sub:askMoney(byHead[h]), href:'#/budget' }))
    });

    const sorted = list.slice().sort((a,b) => (Number(b.amount)||0) - (Number(a.amount)||0));
    if(sorted.length) groups.push({
      label: f.top ? 'Largest first' : 'Entries',
      rows: sorted.slice(0, f.top ? 5 : 12).map(askEntryRow)
    });

    if(!list.length) note = 'Nothing recorded in the budget for that yet.';
    return { title, note, stats, groups };
  }

  /* ---------- people who need a conversation ---------- */
  if(r.topics.includes('checkins') || f.stale){
    title = 'Check-ins';
    stats.push({ n: i.stale.length, label: 'overdue a check-in' });
    if(i.stale.length) groups.push({
      label: 'No check-in filed in the last 14 days',
      rows: i.stale.map(s => ({
        kind:'Member', title:s.p.name,
        sub: s.last ? 'last on ' + s.last + ' · ' + s.age + ' days ago' : 'never checked in',
        href:'#/p/' + s.p.id }))
    });
    else note = 'Everyone has been checked in with recently.';
    return { title, note, stats, groups };
  }

  /* ---------- one person ---------- */
  if(r.person && !r.topics.length){
    const p = r.person;
    const pr = progressOf(p);
    const open = p.checkins.filter(c => !c.done);
    title = p.name;
    note  = p.role;
    stats.push({ n: p.goals.length, label: 'goals' });
    stats.push({ n: pr.pct + '%', label: 'complete' });
    stats.push({ n: open.length, label: 'open check-in' + (open.length===1?'':'s') });

    if(p.goals.length) groups.push({ label:'Goals', rows: p.goals.map(g => askGoalRow(p,g)) });
    if(p.wins.length) groups.push({
      label:'Wins', rows: p.wins.slice(0,5).map(w => ({ kind:'Win', title:w.text || '(empty)', sub:w.date, href:'#/p/'+p.id })) });
    if(p.concerns.length) groups.push({
      label:'Concerns', rows: p.concerns.slice(0,5).map(c => ({ kind:'Concern', title:c.text || '(empty)', sub:c.date, href:'#/p/'+p.id })) });
    if(!p.goals.length && !p.wins.length && !p.concerns.length)
      note = p.role + ' — nothing recorded against them yet.';
    return { title, note, stats, groups };
  }

  /* ---------- goals ---------- */
  if(r.topics.includes('goals')){
    let list = [];
    DB.people.forEach(p => pgoals(p).forEach(g => list.push({ p, g })));
    if(r.person) list = list.filter(x => x.p.id === r.person.id);
    if(f.risk)   list = list.filter(x => x.g.status === 'risk' || x.g.status === 'hold');
    if(f.done)   list = list.filter(x => x.g.status === 'done');
    if(f.open)   list = list.filter(x => x.g.status !== 'done');

    title = f.risk ? 'Goals needing attention'
          : f.done ? 'Goals achieved'
          : r.person ? r.person.name + '’s goals' : 'Goals';
    stats.push({ n: list.length, label: 'goals' });
    if(!r.person && !f.risk) stats.push({ n: i.atRisk.length, label: 'at risk or on hold' });
    if(list.length) groups.push({ label:'', rows: list.map(x => askGoalRow(x.p, x.g)) });
    else note = 'No goals match that.';
    return { title, note, stats, groups };
  }

  /* ---------- team ---------- */
  if(r.topics.includes('people')){
    const list = DB.people;
    title = 'The team';
    stats.push({ n: list.length, label: 'people' });
    stats.push({ n: list.reduce((n,p) => n + p.goals.length, 0), label: 'goals between them' });
    stats.push({ n: i.stale.length, label: 'need a check-in' });
    groups.push({ label:'', rows: list.map(askPersonRow) });
    return { title, note, stats, groups };
  }

  /* ---------- reminders ---------- */
  if(r.topics.includes('reminders')){
    let list = DB.reminders.slice();
    if(f.overdue)   list = i.remOverdue.slice();
    else if(f.soon) list = i.remSoon.slice();
    else if(f.done) list = list.filter(x => x.done);
    else if(f.open) list = list.filter(x => !x.done);
    if(f.today)     list = list.filter(x => x.date === now);
    if(r.person)    list = list.filter(x => (x.who||'').toLowerCase()
                       .includes(r.person.name.toLowerCase().split(/\s+/)[0]));

    title = f.overdue ? 'Overdue reminders' : f.soon ? 'Reminders due in the next 7 days' : 'Reminders';
    stats.push({ n: list.length, label: 'reminders' });
    stats.push({ n: i.remOverdue.length, label: 'overdue' });
    if(list.length) groups.push({ label:'', rows: list.map(askRemRow) });
    else note = 'Nothing matches — nothing to chase.';
    return { title, note, stats, groups };
  }

  /* ---------- tasks, and the general "what needs doing" question ---------- */
  const asksAboutWork = r.topics.includes('tasks') || f.overdue || f.soon || f.done ||
                        f.open || f.today || r.priority || r.month;
  if(asksAboutWork){
    let list = DB.myTasks.slice();
    if(f.overdue)   list = i.overdue.slice();
    else if(f.done) list = list.filter(t => t.status === 'done');
    else if(f.soon) list = i.dueThisWeek.slice();
    else if(f.open) list = list.filter(t => t.status !== 'done');
    if(f.today)        list = list.filter(t => t.due === now);
    if(r.priority)     list = list.filter(t => Number(t.priority) === r.priority);
    if(r.month)        list = list.filter(t => t.month === r.month);

    title = f.overdue ? 'Overdue tasks'
          : f.soon    ? 'Tasks due in the next 7 days'
          : f.done    ? 'Completed tasks'
          : r.priority ? 'Priority ' + r.priority + ' tasks'
          : r.month   ? 'Tasks in ' + r.month
          : 'Tasks';
    stats.push({ n: list.length, label: 'tasks' });
    stats.push({ n: i.overdue.length, label: 'overdue' });
    stats.push({ n: i.dueThisWeek.length, label: 'due this week' });

    if(list.length) groups.push({ label:'', rows: sortTasks(list).map(askTaskRow) });
    else note = 'Nothing matches that — which is usually good news.';

    /* an overdue question is rarely only about tasks */
    if(f.overdue && i.remOverdue.length)
      groups.push({ label:'Reminders past their date', rows: i.remOverdue.map(askRemRow) });
    return { title, note, stats, groups };
  }

  /* ---------- anything at risk, in general ---------- */
  if(f.risk){
    title = 'Needing attention';
    stats.push({ n: i.overdue.length, label: 'overdue tasks' });
    stats.push({ n: i.remOverdue.length, label: 'overdue reminders' });
    stats.push({ n: i.atRisk.length, label: 'goals at risk' });
    stats.push({ n: i.stale.length, label: 'people to check in with' });
    if(i.overdue.length)   groups.push({ label:'Overdue tasks', rows: i.overdue.map(askTaskRow) });
    if(i.remOverdue.length)groups.push({ label:'Overdue reminders', rows: i.remOverdue.map(askRemRow) });
    if(i.atRisk.length)    groups.push({ label:'Goals at risk or on hold', rows: i.atRisk.map(x => askGoalRow(x.p, x.g)) });
    if(i.stale.length)     groups.push({ label:'No recent check-in', rows: i.stale.map(s => ({
      kind:'Member', title:s.p.name, sub: s.last ? 'last on ' + s.last : 'never', href:'#/p/'+s.p.id })) });
    if(!groups.length) note = 'Nothing is flagged right now.';
    return { title, note, stats, groups };
  }

  /* ---------- nothing recognised: search everything ---------- */
  return askSearch(q, r);
}

/* ==========================================================
   The fallback — plain search across every record
   ========================================================== */
function askSearch(q, r){
  const rows = [];
  const push = (row, text) => rows.push({ row, text: (text || '').toLowerCase() });

  DB.myTasks.forEach(t => push(askTaskRow(t), [t.name, t.note, t.month].join(' ')));
  DB.reminders.forEach(x => push(askRemRow(x), [x.title, x.note, x.who].join(' ')));
  DB.budget.entries.forEach(e => push(askEntryRow(e), [e.title, e.head, e.vendor, e.by, e.program].join(' ')));
  DB.people.forEach(p => {
    push(askPersonRow(p), [p.name, p.role].join(' '));
    p.goals.forEach(g => push(askGoalRow(p, g),
      [g.name, g.objective, g.timeline, p.name,
       g.subtasks.map(s => s.text).join(' '),
       g.comments.map(c => c.text).join(' ')].join(' ')));
    p.wins.forEach(w => push({ kind:'Win', title:w.text||'(empty)', sub:p.name+' · '+w.date, href:'#/p/'+p.id }, w.text));
    p.concerns.forEach(c => push({ kind:'Concern', title:c.text||'(empty)', sub:p.name+' · '+c.date, href:'#/p/'+p.id }, c.text));
  });

  const words = r.words.filter(w => !/^(the|and|what|which|show|list|give|about|from|with|have|has|are|for|any|all|tell|find)$/.test(w));
  const hits = rows
    .map(x => ({ ...x, score: words.reduce((n,w) => n + (x.text.includes(w) ? 1 : 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 25)
    .map(x => x.row);

  if(!hits.length){
    return {
      title: 'No answer for that one',
      note: 'Nothing in the tracker matched those words. Try naming a person, ' +
            'or ask about tasks, reminders, goals, the budget or check-ins.',
      stats: [], groups: []
    };
  }
  return {
    title: 'Matches in your records',
    note: hits.length + ' thing' + (hits.length===1?'':'s') + ' mention that.',
    stats: [], groups: [{ label:'', rows: hits }]
  };
}

/* ==========================================================
   The panel
   ========================================================== */
const ASK_EXAMPLES = [
  'What is overdue?',
  'What is due this week?',
  'How much have we spent?',
  'Which goals need attention?',
  'Who needs a check-in?',
  'Priority 1 tasks'
];

function openAsk(seed){
  const wrap = openModal('Ask about your tracker', `
    <div class="ask">
      <div class="ask-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a9 9 0 1 0 4.5 16.8L21 21l-1.2-4.5A9 9 0 0 0 12 3z"/>
          <path d="M9.2 9.5a2.8 2.8 0 1 1 3.6 2.7c-.5.2-.8.6-.8 1.1v.4"/><path d="M12 16.4h.01"/>
        </svg>
        <input id="ask-q" placeholder="Ask anything about your tasks, team, goals, reminders or budget"
               autocomplete="off" spellcheck="false">
        <button class="btn go" id="ask-run">Ask</button>
      </div>
      <div class="ask-eg" id="ask-eg">
        ${ASK_EXAMPLES.map(e => `<button class="ask-chip">${esc(e)}</button>`).join('')}
      </div>
      <div class="ask-out" id="ask-out">
        <p class="muted" style="margin:0">
          Everything is answered from the records on this machine — nothing is sent anywhere.
        </p>
      </div>
    </div>`, { wide:true });

  const box = wrap.querySelector('#ask-q');
  const run = () => askDraw(box.value);

  wrap.querySelector('#ask-run').onclick = run;
  box.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); run(); } };
  wrap.querySelectorAll('.ask-chip').forEach(c => {
    c.onclick = () => { box.value = c.textContent; run(); };
  });

  if(seed){ box.value = seed; run(); }
  setTimeout(() => box.focus(), 90);
}

function askDraw(question){
  const out = document.getElementById('ask-out');
  if(!out) return;
  const a = askAnswer(question);
  if(!a){ out.innerHTML = `<p class="muted" style="margin:0">Type a question first.</p>`; return; }

  const statRow = a.stats.length ? `
    <div class="ask-stats">
      ${a.stats.map(s => `<div class="ask-stat"><b>${esc(String(s.n))}</b><span>${esc(s.label)}</span></div>`).join('')}
    </div>` : '';

  const groupHtml = a.groups.map(g => `
    ${g.label ? `<h4 class="ask-gl">${esc(g.label)}</h4>` : ''}
    <div class="ask-rows">
      ${g.rows.map(row => `
        <button class="ask-row" data-href="${esc(row.href)}">
          <span class="ask-kind">${esc(row.kind)}</span>
          <span class="ask-title">${esc(row.title)}</span>
          <span class="ask-sub">${esc(row.sub || '')}</span>
        </button>`).join('')}
    </div>`).join('');

  out.innerHTML = `
    <h3 class="ask-h">${esc(a.title)}</h3>
    ${a.note ? `<p class="ask-note">${esc(a.note)}</p>` : ''}
    ${statRow}
    ${groupHtml}`;

  out.querySelectorAll('.ask-row').forEach(b => {
    b.onclick = () => { closeModal(); setTimeout(() => navigate(b.dataset.href), 80); };
  });
}

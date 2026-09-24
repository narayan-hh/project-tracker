/* ==========================================================
   My Workstation — newer versions of two pages
   ----------------------------------------------------------
   Loaded after views.js, so these replace the originals.
   Kept separate to make it obvious what has changed.
   ========================================================== */

/* ==========================================================
   Filters on the tasks page — kept in memory, not saved,
   so the page always opens showing everything.
   ========================================================== */
const TASKFILTER = { q:'', month:'all', status:'all', overdue:false };

function visibleTasks(){
  const now = today();
  const q = TASKFILTER.q.toLowerCase().trim();

  return DB.myTasks.filter(t => {
    if(q && !(String(t.name).toLowerCase().includes(q) ||
              String(t.note||'').toLowerCase().includes(q))) return false;
    if(TASKFILTER.month !== 'all' && t.month !== TASKFILTER.month) return false;
    if(TASKFILTER.status !== 'all' && t.status !== TASKFILTER.status) return false;
    if(TASKFILTER.overdue && !(t.status !== 'done' && t.due && t.due < now)) return false;
    return true;
  });
}
const filtersOn = () =>
  TASKFILTER.q || TASKFILTER.month !== 'all' || TASKFILTER.status !== 'all' || TASKFILTER.overdue;

/* ---------- the little due-date pill on each card ---------- */
function dueBadge(t){
  const now = today();
  let cls = '';
  if(t.status !== 'done' && t.due){
    const left = daysAhead(t.due);
    if(t.due < now) cls = 'late';
    else if(left !== null && left <= 3) cls = 'soon';
  }
  return `
    <span class="tc-due ${cls}" title="Due date">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/>
           <path d="M8 3v4M16 3v4M3 11h18"/></svg>
      <input type="date" value="${esc(t.due || '')}"
             data-act="set-date" data-path="myTasks#${t.id}.due">
    </span>`;
}

/* ==========================================================
   HOW A TASK IS DOING

   Three states, and none of them is typed in. The status
   dropdown says what stage a task is at; the due date says
   whether it is in trouble. Put together they give:

     Completed        finished, whenever it was due
     On track         still open, still in time
     Needs attention  still open, past its due date

   Everything on this page is coloured from these three — the
   cards, the bars and the tiles — so the colours only have to
   be learnt once. A task with no due date is on track: nothing
   about it says it is late. The overview counts those
   separately so they are not quietly forgotten.
   ========================================================== */
const TASK_STATES = {
  risk:  { label:'Needs attention' },
  track: { label:'On track'        },
  done:  { label:'Completed'       }
};

function taskState(t){
  if(t.status === 'done') return 'done';
  if(t.due && t.due < today()) return 'risk';
  return 'track';
}

function countStates(list){
  const c = { risk:0, track:0, done:0, total:list.length };
  list.forEach(t => c[taskState(t)]++);
  return c;
}

/* ==========================================================
   ONE BAR, THREE BANDS
   Used for the whole board, for each priority and for each
   month. Worst first, so a bar reads left to right as trouble,
   then work in hand, then done.
   ========================================================== */
function stateBar(c, big){
  if(!c.total) return `<div class="sbar ${big?'big':''} none" aria-hidden="true"></div>`;
  const seg = k => c[k]
    ? `<i class="sb-${k}" style="width:${(c[k] / c.total * 100).toFixed(2)}%"
           title="${c[k]} ${TASK_STATES[k].label.toLowerCase()}"></i>`
    : '';
  return `
    <div class="sbar ${big?'big':''}" role="img"
         aria-label="${c.risk} need attention, ${c.track} on track, ${c.done} completed">
      ${seg('risk')}${seg('track')}${seg('done')}
    </div>`;
}

/* a labelled row: what it is, how it is going, and how far along */
function barRow(label, c){
  return `
    <div class="bar-row">
      <span class="bar-lab" title="${esc(label)}">${esc(label)}</span>
      ${stateBar(c)}
      <span class="bar-num">${c.total ? c.done + '/' + c.total : '&ndash;'}</span>
    </div>`;
}

/* ==========================================================
   THE RING

   A pie puts the three states side by side but leaves every
   figure to a separate key. This is the same three wedges with
   the total in the middle and the numbers read off beside it,
   so each state carries its own count and its own share instead
   of one headline percentage standing in for all three.
   ========================================================== */
function stateRing(c){
  const r = 54, C = 2 * Math.PI * r;
  const bands = ['risk','track','done'].filter(k => c[k] > 0);
  const gap = bands.length > 1 ? 3 : 0;      /* a hairline between wedges */
  let acc = 0;

  const arcs = c.total ? bands.map(k => {
    const len  = C * (c[k] / c.total);
    const draw = Math.max(len - gap, 1.2);
    const arc = `<circle cx="75" cy="75" r="${r}" fill="none"
        stroke="var(--st-${k})" stroke-width="19"
        stroke-dasharray="${draw.toFixed(2)} ${(C - draw).toFixed(2)}"
        stroke-dashoffset="${(-acc).toFixed(2)}"
        transform="rotate(-90 75 75)" class="stwheel-arc"/>`;
    acc += len;
    return arc;
  }).join('') : '';

  return `
    <svg class="stwheel" viewBox="0 0 150 150" role="img"
         aria-label="${c.total} tasks: ${c.risk} need attention, ${c.track} on track, ${c.done} completed">
      <circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--stwheel-track)" stroke-width="19"/>
      ${arcs}
      <text x="75" y="71" text-anchor="middle" class="stwheel-total" aria-hidden="true">${c.total}</text>
      <text x="75" y="90" text-anchor="middle" class="stwheel-cap" aria-hidden="true">task${c.total === 1 ? '' : 's'}</text>
    </svg>`;
}

/* The figures beside the ring — one line per state with its own
   count and share, so nothing has to be judged by the size of a
   wedge. */
function wheelKey(c){
  return ['risk','track','done'].map(k => `
    <div class="stwheel-row">
      <i class="sb-${k}" aria-hidden="true"></i>
      <span class="stwheel-lab">${TASK_STATES[k].label}</span>
      <b class="stwheel-num">${c[k]}</b>
      <span class="stwheel-pct">${c.total ? Math.round(c[k] / c.total * 100) : 0}%</span>
    </div>`).join('');
}

/* ==========================================================
   THE OVERVIEW AT THE TOP OF MY TASKS

   Four panels, each answering a different question, so none of
   them repeats another:

     How much   the ring — every state with its own figure
     What now   the tasks themselves, named, oldest first
     Where      which priority is carrying the trouble
     When       which month the work is piling up in

   All of it is counted from every task, never from the filtered
   list underneath: an overview that moved as you searched would
   be misleading. The list below is the one that filters.
   ========================================================== */
function taskDash(){
  const all = DB.myTasks;
  if(!all.length) return '';          /* nothing to summarise yet */

  const c    = countStates(all);
  const now  = today();
  const open = all.filter(t => t.status !== 'done');

  const overdue = open.filter(t => t.due && t.due < now)
                      .sort((a,b) => String(a.due).localeCompare(String(b.due)));
  const soon = open.filter(t => {
                      const d = daysAhead(t.due);
                      return d !== null && d >= 0 && d <= 7;
                    }).sort((a,b) => String(a.due).localeCompare(String(b.due)));
  const noDate = open.filter(t => !t.due);

  const late = t => {
    const d = daysAhead(t.due);
    if(d === null) return '';
    const n = Math.abs(d);
    return n + (n === 1 ? ' day late' : ' days late');
  };
  const inDays = t => {
    const d = daysAhead(t.due);
    return d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days';
  };

  /* ---------- the four figures, each one a fact the ring does
       not already give you ---------- */
  const tile = (n, label, sub, cls) => `
    <div class="tile ${cls || ''}">
      <b>${n}</b><span>${label}</span><em>${sub}</em>
    </div>`;

  const oldest = overdue.length ? 'oldest ' + late(overdue[0]) : 'nothing is late';
  const next   = soon.length ? 'next one ' + inDays(soon[0])
               : open.length ? 'none within 7 days' : 'no open tasks';

  /* ---------- what needs you now ---------- */
  const urgentRow = (t, right, cls) => `
    <div class="urg-row">
      <span class="dot ${cls}" aria-hidden="true"></span>
      <span class="urg-name" title="${esc(t.name)}">${esc(t.name)}</span>
      <span class="urg-pri">P${t.priority}</span>
      <span class="urg-when ${cls}">${right}</span>
    </div>`;

  const cap = 3;
  const moreLine = (list, word) => list.length > cap
    ? `<p class="urg-more">and ${list.length - cap} more ${word}</p>` : '';

  const needsYou = (overdue.length || soon.length)
    ? `${overdue.length ? `
        <h4 class="urg-head">Overdue <span>${overdue.length}</span></h4>
        ${overdue.slice(0, cap).map(t => urgentRow(t, late(t), 's-risk')).join('')}
        ${moreLine(overdue, 'overdue')}` : ''}
       ${soon.length ? `
        <h4 class="urg-head">Due within 7 days <span>${soon.length}</span></h4>
        ${soon.slice(0, cap).map(t => urgentRow(t, inDays(t), 's-track')).join('')}
        ${moreLine(soon, 'due soon')}` : ''}`
    : `<div class="urg-clear">
         <span class="urg-tick" aria-hidden="true">&#10003;</span>
         <p>Nothing is overdue, and nothing falls due in the next seven days.</p>
       </div>`;

  /* ---------- where the trouble is, and when the load is ---------- */
  const byPriority = PRIORITIES.map(pr =>
    barRow(pr.label, countStates(all.filter(t => t.priority === pr.n)))).join('');

  const monthsUsed = MONTHS.filter(m => all.some(t => t.month === m));
  const byMonth = monthsUsed.length
    ? monthsUsed.map(m => barRow(m, countStates(all.filter(t => t.month === m)))).join('')
    : `<p class="muted" style="margin:0">No months set yet.</p>`;

  return `
    <div class="tiles dash-tiles">
      ${tile(all.length, 'Tasks in all', open.length + ' open &middot; ' + c.done + ' done')}
      ${tile(overdue.length, 'Overdue', oldest, 'st-risk')}
      ${tile(soon.length, 'Due within 7 days', next, 'st-track')}
      ${tile(noDate.length, 'With no due date',
             noDate.length ? 'never flagged as late' : 'every open task has one')}
    </div>

    <div class="dash-grid">
      <section class="panel reveal dash-panel">
        <div class="section-head"><h2>How the board stands</h2></div>
        <div class="dash-ring">
          ${stateRing(c)}
          <div class="stwheel-key">${wheelKey(c)}</div>
        </div>
        <p class="dash-foot">
          ${noDate.length
            ? `<b>${noDate.length}</b> open task${noDate.length === 1 ? '' : 's'} ${noDate.length === 1 ? 'has' : 'have'} no due date, so ${noDate.length === 1 ? 'it' : 'they'} can never be flagged as late.`
            : `Every open task has a due date, so nothing can slip past unnoticed.`}
        </p>
      </section>

      <section class="panel reveal dash-panel">
        <div class="section-head">
          <h2>What needs you now</h2>
          <span class="spacer"></span>
          ${overdue.length ? `<a class="btn tiny" href="#/review">Weekly review</a>` : ''}
        </div>
        <div class="dash-urgent">${needsYou}</div>
      </section>

      <section class="panel reveal dash-panel">
        <div class="section-head"><h2>By priority</h2>
          <span class="spacer"></span>
          <span class="muted">done of total</span>
        </div>
        <div class="dash-bars">${byPriority}</div>
      </section>

      <section class="panel reveal dash-panel">
        <div class="section-head"><h2>By month</h2>
          <span class="spacer"></span>
          <span class="muted">done of total</span>
        </div>
        <div class="dash-bars dash-months">${byMonth}</div>
      </section>
    </div>
  `;
}

/* ==========================================================
   MY TASKS
   ========================================================== */
function viewTasks(){
  const shown = visibleTasks();
  const now = today();

  const cols = PRIORITIES.map(pr => {
    const list = sortTasks(shown.filter(t => t.priority === pr.n));
    const open = list.filter(t => t.status !== 'done').length;
    const late = list.filter(t => t.status !== 'done' && t.due && t.due < now).length;

    return `
    <section class="col pri-${pr.n}" data-col="${pr.n}">
      <header class="col-head">
        <div>
          <h3>${pr.label}</h3>
          <p>${pr.hint} &middot; ${open} open of ${list.length}${late?` &middot; <b style="color:#a9455f">${late} overdue</b>`:''}</p>
        </div>
        <button class="btn tiny" data-act="add-task" data-pri="${pr.n}">+ Task</button>
      </header>
      ${stateBar(countStates(list))}
      <div class="col-body">
        ${list.length ? list.map(t => `
          <article class="task-card t-${taskState(t)} ${t.status==='done'?'is-done':''} pop"
                   data-task="${t.id}" draggable="true">
            <div class="tc-top">
              <span class="grip" title="Drag to another priority" aria-hidden="true">&#8942;&#8942;</span>
              ${monthSelect(`myTasks#${t.id}.month`, t.month)}
              ${taskSelect(`myTasks#${t.id}.status`, t.status)}
              <span class="spacer"></span>
              <button class="x" data-act="del-task" title="Remove">&times;</button>
            </div>
            <p class="tc-name">${ed(`myTasks#${t.id}.name`, t.name, 'Task name')}</p>
            <p class="tc-note">${ed(`myTasks#${t.id}.note`, t.note || '', 'Add a note')}</p>
            <div class="tc-bot">
              ${dueBadge(t)}
              <span class="tc-meta">
                <span class="status st-${taskState(t)}">${TASK_STATES[taskState(t)].label}</span>
                <select class="mini-sel" data-act="set-field" aria-label="Priority"
                        data-path="myTasks#${t.id}.priority" data-num="1">
                  ${PRIORITIES.map(x => `<option value="${x.n}" ${x.n===t.priority?'selected':''}>P${x.n}</option>`).join('')}
                </select>
              </span>
            </div>
          </article>`).join('')
        : filtersOn()
          ? emptyState('Nothing matches the filters.',
              `<button class="btn tiny" data-act="tf-clear">Clear filters</button>`)
          : emptyState('No tasks here yet.',
              `<button class="btn tiny" data-act="add-task" data-pri="${pr.n}">+ Add one</button>`)}
      </div>
    </section>`;
  }).join('');

  const monthsInUse = [...new Set(DB.myTasks.map(t => t.month))].filter(Boolean);
  const overdueTotal = DB.myTasks.filter(t => t.status !== 'done' && t.due && t.due < now).length;

  return `
  <div class="page t-tasks">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>My Tasks</h1>
        <p class="sub">Drag a card to change its priority &middot; completed tasks drop to the bottom</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="add-task" data-pri="1">+ Add a task</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

    ${taskDash()}

    <div class="section-head reveal">
      <h2>Every task</h2>
      <span>the overview counts every task; this list is the one that filters</span>
    </div>

    ${tasksSyncPanel()}

    <div class="filters reveal">
      <span class="tb-label">Find</span>
      <input class="f-search" id="tf-q" type="search" placeholder="Search tasks…"
             aria-label="Search tasks by name or note" value="${esc(TASKFILTER.q)}">
      <select class="mini-sel" id="tf-month" aria-label="Filter by month">
        <option value="all">Every month</option>
        ${monthsInUse.map(m => `<option value="${m}" ${TASKFILTER.month===m?'selected':''}>${m}</option>`).join('')}
      </select>
      <button class="f-chip ${TASKFILTER.status==='all'?'on':''}" data-act="tf-status" data-v="all">All</button>
      <button class="f-chip ${TASKFILTER.status==='todo'?'on':''}" data-act="tf-status" data-v="todo">Not started</button>
      <button class="f-chip ${TASKFILTER.status==='wip'?'on':''}" data-act="tf-status" data-v="wip">In progress</button>
      <button class="f-chip ${TASKFILTER.status==='done'?'on':''}" data-act="tf-status" data-v="done">Completed</button>
      <button class="f-chip ${TASKFILTER.overdue?'on':''}" data-act="tf-overdue">Overdue${overdueTotal?` (${overdueTotal})`:''}</button>
      <span class="spacer"></span>
      ${filtersOn() ? `<button class="btn tiny" data-act="tf-clear">Clear filters</button>` : ''}
      <span class="muted">${shown.length} of ${DB.myTasks.length}</span>
    </div>

    <div class="cols">${cols}</div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   SETTINGS — import and export now live in one place per
   section, and the old paste box has moved into the window.
   ========================================================== */
function viewSettings(){
  const me = theLead();

  const impRow = (target, label, note) => `
    <div class="map-row">
      <span class="map-lab" style="width:auto;flex:1">${label}<br><em style="font-style:normal;color:var(--ink-soft);font-size:11.5px">${note}</em></span>
      <button class="btn tiny" data-act="open-import" data-target="${target}">Import</button>
      <button class="btn tiny" data-act="export-csv" data-target="${target}">Export</button>
    </div>`;

  return `
  <div class="page t-set">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>Settings</h1>
        <p class="sub">Spreadsheets, backups and site details</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="export">Export full backup</button>
      <button class="btn" data-act="import-json">Restore backup</button>
      <button class="btn" data-act="import-kpis">Load KPIs</button>
      <button class="btn" data-act="selftest">Run a self-check</button>
      <span class="spacer"></span>
      <button class="btn danger" data-act="reset">Reset everything</button>`)}

    <div id="selftest-out"></div>

    <div class="detail-grid">

      <div class="panel reveal">
        <h3>Spreadsheets</h3>
        <p class="muted" style="margin-top:0">
          Import takes an Excel <b>.xlsx</b> file straight from your computer, a
          <b>.csv</b>, or cells copied out of Excel. You get to check which column
          means what before anything is added. Export saves the section as a CSV
          that opens directly in Excel.
        </p>
        <div class="map-grid" style="grid-template-columns:1fr">
          ${impRow('myTasks','My Tasks','Task, Month, Status, Priority, Due date, Note')}
          ${impRow('goals','Goals / KPIs','Goal name, Objective, Timeline, Status')}
          ${impRow('reminders','Reminders','Reminder, Date, Who, Note')}
          ${impRow('budget','Budget entries','Date, Expense Title, Amount, Vendor, By (M4C emp), Budget Head, Approved by')}
          ${impRow('people','Team members','Name, Role')}
        </div>
        <p class="muted" style="margin-bottom:0">
          You can also import from any page directly &mdash; every section has its own
          <b>Import</b> button, or press <kbd>i</kbd> while you are on it.
        </p>
      </div>

      <div class="panel reveal">
        <h3>Site details</h3>
        <div class="field">
          <label>Site title</label>
          <div class="box" data-edit="meta.title" data-ph="My Workstation"
               contenteditable="true" spellcheck="false">${esc(DB.meta.title)}</div>
        </div>
        <div class="field">
          <label>Tagline</label>
          <div class="box" data-edit="meta.tagline" data-ph="A short line"
               contenteditable="true" spellcheck="false">${esc(DB.meta.tagline)}</div>
        </div>
        <div class="field">
          <label>My name</label>
          <div class="box" data-edit="people#${me.id}.name" data-ph="Your name"
               contenteditable="true" spellcheck="false">${esc(me.name)}</div>
        </div>
        <div class="field">
          <label>My role</label>
          <div class="box" data-edit="people#${me.id}.role" data-ph="Your role"
               contenteditable="true" spellcheck="false">${esc(me.role)}</div>
        </div>

        <h3 style="margin-top:26px">Backup</h3>
        <p class="muted" style="margin:0">
          Your data lives in this browser only, so it is worth keeping a file copy.
          <b>Export full backup</b> at the top of this page saves one; <b>Restore backup</b>
          reads it back.
        </p>

        <h3 style="margin-top:26px">Shortcuts</h3>
        <p class="muted" style="margin-top:0">
          Press <kbd>Ctrl</kbd>+<kbd>K</kbd> to jump anywhere, <kbd>n</kbd> for a new item,
          <kbd>i</kbd> to import, <kbd>?</kbd> for the full list.
        </p>
        <button class="btn" data-act="shortcuts">Show all shortcuts</button>
      </div>

    </div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   BUDGET
   ----------------------------------------------------------
   Columns, in order:
     Date | Expense Title | Amount | Vendor | By (M4C emp)
     | Budget Head | Approved by
   Every cell is editable in place. The table scrolls sideways
   on a narrow screen rather than squashing the columns.
   ========================================================== */
function viewBudget(){
  const entries = [...DB.budget.entries].sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const total = entries.reduce((n,e) => n + (Number(e.amount)||0), 0);
  /* paise are shown only when there are any, so whole rupees stay clean */
  const money = n => {
    const v = Number(n) || 0;
    const hasPaise = Math.abs(v % 1) > 0.0001;
    return '₹' + v.toLocaleString('en-IN', hasPaise
      ? { minimumFractionDigits:2, maximumFractionDigits:2 }
      : { maximumFractionDigits:0 });
  };

  /* totals per budget head, biggest first */
  const byHead = {};
  entries.forEach(e => {
    const h = e.head || 'Other';
    byHead[h] = (byHead[h] || 0) + (Number(e.amount)||0);
  });
  const heads = Object.keys(byHead).sort((a,b) => byHead[b] - byHead[a]);

  /* how much is still waiting for an approval name */
  const unapproved = entries.filter(e => !String(e.approvedBy || '').trim());
  const unapprovedSum = unapproved.reduce((n,e) => n + (Number(e.amount)||0), 0);

  const rows = entries.map(e => `
    <tr data-entry="${e.id}">
      <td>${ed(`budget.entries#${e.id}.program`, e.program || '', 'Which program?')}</td>
      <td>${ed(`budget.entries#${e.id}.date`, e.date, 'YYYY-MM-DD')}</td>
      <td>${ed(`budget.entries#${e.id}.title`, e.title, 'What was it for?')}</td>
      <td class="num">${ed(`budget.entries#${e.id}.amount`, e.amount, '0', 'span', '', true)}</td>
      <td>${ed(`budget.entries#${e.id}.vendor`, e.vendor || '', 'Shop / supplier')}</td>
      <td>${ed(`budget.entries#${e.id}.by`, e.by, 'M4C employee')}</td>
      <td>
        <select class="mini-sel" data-act="set-field" data-path="budget.entries#${e.id}.head">
          ${DB.budget.heads.map(h => `<option ${h===e.head?'selected':''}>${esc(h)}</option>`).join('')}
        </select>
      </td>
      <td class="${String(e.approvedBy||'').trim() ? '' : 'needs-ok'}">
        ${ed(`budget.entries#${e.id}.approvedBy`, e.approvedBy || '', 'Not yet approved')}
      </td>
      <td><button class="x" data-act="del-entry" title="Remove">&times;</button></td>
    </tr>`).join('');

  return `
  <div class="page t-budget">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>Budget</h1>
        <p class="sub">${entries.length} entries &middot; ${money(total)} total</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="add-entry">+ Add expense</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

    ${budgetSyncPanel()}

    <div class="tiles">
      <div class="tile"><b>${money(total)}</b><span>Total spend</span>
        <em>${entries.length} entries</em></div>
      <div class="tile ${unapproved.length ? 'bad' : ''}">
        <b>${unapproved.length}</b><span>Waiting for approval</span>
        <em>${money(unapprovedSum)}</em></div>
      ${heads.slice(0,2).map(h => `
        <div class="tile"><b>${money(byHead[h])}</b><span>${esc(h)}</span>
          <em>${total ? Math.round(byHead[h]/total*100) : 0}% of spend</em></div>`).join('')}
    </div>

    <div class="panel reveal" style="padding:14px">
      ${entries.length ? `
      <p class="table-note">Scroll the table sideways to see every column.</p>
      <div class="table-wrap">
        <table class="grid-table budget-table">
          <thead>
            <tr>
              <th>Program Name</th>
              <th>Date</th>
              <th>Expense Title</th>
              <th class="num">Amount</th>
              <th>Vendor</th>
              <th>By (M4C emp)</th>
              <th>Budget Head</th>
              <th>Approved by</th>
              <th><span class="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <th colspan="3">Total</th>
              <th class="num">${money(total)}</th>
              <th colspan="5"></th>
            </tr>
          </tfoot>
        </table>
      </div>` : emptyState('No expenses recorded yet.',
        `<button class="btn go" data-act="add-entry">+ Add your first expense</button>`)}
    </div>

    <div class="panel reveal" style="margin-top:16px">
      <div class="section-head" style="margin:0 0 12px">
        <h2>Budget heads</h2>
        <span class="spacer"></span>
        <button class="btn tiny" data-act="add-head">+ Add head</button>
      </div>
      <div class="row">
        ${DB.budget.heads.map((h,i) => `
          <span class="head-chip">
            <span data-edit="budget.heads.${i}" data-ph="Head" contenteditable="true" spellcheck="false">${esc(h)}</span>
            <button class="x" type="button" data-act="del-head" data-i="${i}"
                    aria-label="Remove this budget head" title="Remove">&times;</button>
          </span>`).join('')}
      </div>
    </div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

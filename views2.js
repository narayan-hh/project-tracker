/* ==========================================================
   Project Tracker — newer versions of two pages
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
    <section class="col p${pr.n===1?5:pr.n===2?3:2}" data-col="${pr.n}">
      <header class="col-head">
        <div>
          <h3>${pr.label}</h3>
          <p>${pr.hint} &middot; ${open} open of ${list.length}${late?` &middot; <b style="color:#a9455f">${late} overdue</b>`:''}</p>
        </div>
        <button class="btn tiny" data-act="add-task" data-pri="${pr.n}">+ Task</button>
      </header>
      <div class="col-body">
        ${list.length ? list.map(t => `
          <article class="task-card ${t.status==='done'?'is-done':''} pop" data-task="${t.id}" draggable="true">
            <div class="tc-top">
              <span class="grip" title="Drag to another priority">&#8942;&#8942;</span>
              ${monthSelect(`myTasks#${t.id}.month`, t.month)}
              ${taskSelect(`myTasks#${t.id}.status`, t.status)}
              <span class="spacer"></span>
              <button class="x" data-act="del-task" title="Remove">&times;</button>
            </div>
            <p class="tc-name">${ed(`myTasks#${t.id}.name`, t.name, 'Task name')}</p>
            <p class="tc-note">${ed(`myTasks#${t.id}.note`, t.note || '', 'Add a note')}</p>
            <div class="tc-bot">
              ${dueBadge(t)}
              <span class="spacer"></span>
              ${chip(taskStatus(t.status))}
              <select class="mini-sel" data-act="set-field" data-path="myTasks#${t.id}.priority" data-num="1">
                ${PRIORITIES.map(x => `<option value="${x.n}" ${x.n===t.priority?'selected':''}>P${x.n}</option>`).join('')}
              </select>
            </div>
          </article>`).join('')
        : `<div class="empty" style="padding:22px">${filtersOn() ? 'Nothing matches the filters.' : 'No tasks here yet.'}</div>`}
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
      <button class="btn go" data-act="add-task" data-pri="1">+ Priority 1</button>
      <button class="btn go" data-act="add-task" data-pri="2">+ Priority 2</button>
      <button class="btn go" data-act="add-task" data-pri="3">+ Priority 3</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

    <div class="filters reveal">
      <span class="tb-label">Find</span>
      <input class="f-search" id="tf-q" placeholder="Search tasks…" value="${esc(TASKFILTER.q)}">
      <select class="mini-sel" id="tf-month">
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
      <button class="btn" data-act="selftest">Test buttons</button>
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
          <div class="box" data-edit="meta.title" data-ph="Project Tracker"
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
        <p class="muted" style="margin-top:0">
          Your data lives in this browser only. Export saves a real file you can keep safely.
        </p>
        <div class="row">
          <button class="btn" data-act="export">Export backup</button>
          <button class="btn" data-act="import-json">Restore backup</button>
          <button class="btn danger" data-act="reset">Reset everything</button>
        </div>

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
      <button class="btn" data-act="add-head">+ Add budget head</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

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
      <div class="table-wrap">
        <table class="grid-table budget-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Expense Title</th>
              <th class="num">Amount</th>
              <th>Vendor</th>
              <th>By (M4C emp)</th>
              <th>Budget Head</th>
              <th>Approved by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <th colspan="2">Total</th>
              <th class="num">${money(total)}</th>
              <th colspan="5"></th>
            </tr>
          </tfoot>
        </table>
      </div>` : `<div class="empty">No expenses recorded yet.</div>`}
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
            <button class="x" data-act="del-head" data-i="${i}">&times;</button>
          </span>`).join('')}
      </div>
    </div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

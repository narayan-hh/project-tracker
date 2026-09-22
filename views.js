/* ==========================================================
   Work Station — page rendering
   ========================================================== */

/* editable text bound to a data path */
function ed(path, value, ph, tag, cls, num){
  tag = tag || 'span';
  return `<${tag} class="${cls||''}" data-edit="${path}" data-ph="${esc(ph||'')}"`
       + `${num?' data-num="1"':''} contenteditable="true" spellcheck="false">${esc(value)}</${tag}>`;
}

/* ---------- forest decoration ---------- */
function trees(compact){
  const layer = (fill, cls, d, h) =>
    `<svg class="trees ${cls}" viewBox="0 0 1200 200" preserveAspectRatio="none" height="${h}">
       <path fill="${fill}" d="${d}"/></svg>`;
  const far  = 'M0,200 L0,120 Q30,60 55,120 Q75,70 100,120 Q130,50 160,120 Q185,75 210,120 '
             + 'Q240,55 270,120 Q295,80 320,120 Q350,60 380,120 Q405,85 430,120 Q460,55 490,120 '
             + 'Q515,80 540,120 Q570,58 600,120 Q625,82 650,120 Q680,54 710,120 Q735,78 760,120 '
             + 'Q790,56 820,120 Q845,84 870,120 Q900,52 930,120 Q955,80 980,120 Q1010,58 1040,120 '
             + 'Q1065,82 1090,120 Q1120,54 1150,120 Q1175,78 1200,120 L1200,200 Z';
  const mid  = 'M0,200 L0,150 Q40,88 80,150 Q110,96 140,150 Q180,84 220,150 Q250,100 280,150 '
             + 'Q320,86 360,150 Q390,102 420,150 Q460,82 500,150 Q530,98 560,150 Q600,86 640,150 '
             + 'Q670,104 700,150 Q740,84 780,150 Q810,100 840,150 Q880,88 920,150 Q950,102 980,150 '
             + 'Q1020,84 1060,150 Q1090,98 1120,150 Q1160,88 1200,150 L1200,200 Z';
  const near = 'M0,200 L0,176 Q50,124 100,176 Q140,132 180,176 Q230,120 280,176 Q320,136 360,176 '
             + 'Q410,122 460,176 Q500,138 540,176 Q590,124 640,176 Q680,134 720,176 Q770,120 820,176 '
             + 'Q860,138 900,176 Q950,126 1000,176 Q1040,134 1080,176 Q1140,122 1200,176 L1200,200 Z';
  const h = compact ? 92 : 200;
  return layer('var(--tree-far)','far',far,h) + layer('var(--tree-mid)','mid',mid,h) + layer('var(--tree-near)','near',near,h);
}
function critters(compact){
  const ffs = (compact
      ? [[22,52,0],[58,46,2.6],[84,56,4.4]]
      : [[12,72,0],[30,58,2.4],[52,62,1.3],[70,76,5.2],[88,52,3.0]]
    ).map(([l,t,d]) => `<i class="firefly" style="left:${l}%;top:${t}%;animation-delay:${d}s,${d/2}s"></i>`).join('');
  const leafSvg = c => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${c}">
      <path d="M21 3C10 3 3 9 3 18c0 1 0 2 .3 3 1-6 5-10 11-12-4 3-7 6-8 12 8 1 14-4 14-13V3z"/></svg>`;
  const leaves = (compact
      ? [[26,15,1,'#8fc3a6'],[74,16,5,'#b6cf95']]
      : [[14,14,0,'#7cbb98'],[42,16,3,'#a8cf8e'],[68,15,6,'#8fc3a6'],
         [88,17,9,'#c2b78a']]
    ).map(([l,dur,delay,c]) =>
      `<span class="leaf" style="left:${l}%;animation-duration:${dur}s;animation-delay:${delay}s">${leafSvg(c)}</span>`).join('');
  return `<span class="mist m1"></span><span class="mist m2"></span>${ffs}${leaves}`;
}
const forest = compact => critters(compact) + trees(compact);

const watermark = `<svg class="wm" width="96" height="96" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
  <path d="M21 3C10 3 3 9 3 18c0 1 0 2 .3 3 1-6 5-10 11-12-4 3-7 6-8 12 8 1 14-4 14-13V3z"/></svg>`;

const arrowSvg = `<span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
      focusable="false"><path d="M5 12h13M12 5l7 7-7 7"/></svg></span>`;

/* A real button, for a card that is not itself a link. */
const arrowBtn = label => `<button class="go-btn" type="button">${label}${arrowSvg}</button>`;

/* The same thing to look at, but not a second control inside a
   link. A <button> nested in an <a> is invalid and gives keyboard
   and screen-reader users two stops for one destination. */
const arrowTag = label => `<span class="go-btn" aria-hidden="true">${label}${arrowSvg}</span>`;

/* page header banner used on every section.
   NOTE: buttons never go inside the banner — the animated forest art
   lives there. Actions go in the toolbar() row underneath it. */
function banner(opts){
  return `
  <section class="banner ${opts.tall?'tall':'strip'} reveal">
    ${forest(!opts.tall)}
    ${opts.crumbs ? `<div class="banner-in">${opts.crumbs}</div>` : ''}
    <div class="banner-in" style="margin-top:${opts.crumbs?'12px':'0'}">
      ${opts.body}
    </div>
    ${opts.below || ''}
  </section>`;
}

/* a plain row of action buttons, in normal document flow */
function toolbar(inner){
  return `<div class="toolbar reveal">${inner}</div>`;
}

/* ---------- donut progress meter ---------- */
function donut(pct, colour, size){
  size = size || 118;
  const r = 46, c = 2 * Math.PI * r;
  const off = c * (1 - pct/100);
  return `
  <svg class="donut" width="${size}" height="${size}" viewBox="0 0 120 120"
       role="img" aria-label="${pct}% complete">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--donut-track)" stroke-width="13"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${colour}" stroke-width="13"
            stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
            transform="rotate(-90 60 60)" class="donut-arc"/>
    <text x="60" y="59" text-anchor="middle" font-size="25" font-weight="700" fill="var(--ink)"
          aria-hidden="true">${pct}%</text>
    <text x="60" y="78" text-anchor="middle" font-size="11" fill="var(--ink-quiet)"
          aria-hidden="true">complete</text>
  </svg>`;
}

/* An empty section says what is missing and offers the one thing
   you would want to do about it. */
function emptyState(text, action){
  return `<div class="empty"><p>${text}</p>${action || ''}</div>`;
}

/* A page that has nothing to show, usually because a link points
   at something that has since been deleted. */
function notFound(what){
  return `<div class="section-head"><h2>Nothing to show</h2></div>`
       + emptyState(what, `<a class="btn go" href="#/">Back to the home page</a>`);
}

/* status chips */
const chip = s => `<span class="status ${s.cls}">${s.label}</span>`;

/* ==========================================================
   KPI CARDS
   One card per KPI, the same shape as the goal cards. Each
   carries a meter for the whole year and the four quarters
   underneath; the achieved figure on a quarter is editable
   in place, so there is no grid of months to wade through.
   ========================================================== */

/* how a figure reads against its target. Only judged when the
   achieved side has been filled in, so a blank quarter is never
   reported as a miss. */
function kpiState(planned, achieved){
  if(achieved === null) return '';
  if(planned === null || planned === 0) return achieved > 0 ? 'k-met' : '';
  if(achieved >= planned) return 'k-met';
  if(achieved >= planned * 0.6) return 'k-near';
  return 'k-miss';
}

function kpiCards(p, base){
  if(!p.kpis.length){
    return emptyState('No KPIs recorded for this member yet.',
      `<button class="btn go" data-act="add-kpi" data-p="${p.id}">+ Add the first KPI</button>`);
  }

  return `<div class="kpi-grid">` + p.kpis.map((k,i) => {
    const r = kpiRollup(k);
    const state = kpiState(r.planned, r.achieved);

    const quarters = r.quarters.map(q => {
      const qs = kpiState(q.planned, q.achieved);
      const path = `${base}.kpis#${k.id}.periods.${q.q.k}.achieved`;
      return `
        <div class="kq ${qs}">
          <span class="kq-lab">${q.q.label}</span>
          <span class="kq-fig">
            ${ed(path, q.achieved === null ? '' : q.achieved, '–', 'span', 'kq-a')}
            <em>of ${q.planned === null ? '–' : q.planned}</em>
          </span>
        </div>`;
    }).join('');

    return `
    <article class="kcard p${p.palette} reveal" data-kpi="${k.id}"
             style="animation-delay:${Math.min(.04*i, .24).toFixed(2)}s">
      ${watermark}
      <div class="kcard-top">
        ${k.area ? `<span class="kcard-area">${esc(k.area)}</span>` : ''}
        <span class="spacer"></span>
        ${r.hasTarget ? `<span class="kcard-pct ${state}">${r.pct}<em>%</em></span>` : ''}
        <button class="x kcard-del" data-act="del-kpi" data-k="${k.id}"
                title="Remove this KPI">&times;</button>
      </div>

      ${ed(`${base}.kpis#${k.id}.name`, k.name, 'What is the KPI?', 'p', 'kcard-name')}
      ${k.note ? `<p class="kcard-note">${esc(k.note)}</p>` : ''}

      ${r.hasTarget ? `
        <div class="kcard-meter" role="img"
             aria-label="${r.achieved === null ? 0 : r.achieved} achieved of ${r.planned} planned">
          <i class="${state}" style="width:${r.pct}%"></i>
        </div>
        <p class="kcard-sum"><b>${r.achieved === null ? 0 : r.achieved}</b>
           achieved of <b>${r.planned}</b> planned for the year</p>`
      : `<p class="kcard-sum none">No target figures in the sheet for this one</p>`}

      ${/* four "0 of 0" boxes tell you nothing, so they only appear
            once the KPI actually carries figures */''}
      ${r.hasTarget || r.achieved !== null
        ? `<div class="kcard-quarters">${quarters}</div>` : ''}
    </article>`;
  }).join('') + `</div>`;
}
const taskSelect = (path, v) =>
  `<select class="mini-sel" data-act="set-task-status" data-path="${path}">
     ${TASK_STATUS.map(s => `<option value="${s.v}" ${s.v===v?'selected':''}>${s.label}</option>`).join('')}
   </select>`;
const monthSelect = (path, v) =>
  `<select class="mini-sel" data-act="set-field" data-path="${path}">
     ${MONTHS.map(m => `<option value="${m}" ${m===v?'selected':''}>${m}</option>`).join('')}
   </select>`;

/* ==========================================================
   HOME — summary of everything
   ========================================================== */
function viewHome(){
  const me = theLead();
  const team = teamOnly();
  const tasksOpen = DB.myTasks.filter(t => t.status !== 'done').length;
  const tasksDone = DB.myTasks.filter(t => t.status === 'done').length;
  const allGoals  = DB.people.reduce((n,p) => n + p.goals.length, 0);
  const spend     = DB.budget.entries.reduce((n,e) => n + (Number(e.amount)||0), 0);
  const dueSoon   = DB.reminders.filter(r => !r.done)
                      .sort((a,b) => String(a.date).localeCompare(String(b.date))).slice(0,4);
  const mine = progressOf(me);

  const tile = (n, label, sub, href) => `
    <a class="tile reveal" href="${href}">
      <b>${n}</b><span>${label}</span>${sub?`<em>${sub}</em>`:''}
    </a>`;

  const topTasks = PRIORITIES.map(pr => {
    const list = sortTasks(DB.myTasks.filter(t => t.priority === pr.n && t.status !== 'done')).slice(0,3);
    return `
      <div class="mini-col">
        <h4>${pr.label}</h4>
        ${list.length ? list.map(t => `
          <div class="mini-row">
            <span class="dot ${taskStatus(t.status).cls}"></span>
            <span class="t" title="${esc(t.name)}">${esc(t.name)}</span>
            <span class="m">${esc(t.month)}</span>
          </div>`).join('')
        : `<p class="muted">Nothing open</p>`}
      </div>`;
  }).join('');

  const teamStrip = team.map((p,i) => {
    const pg = progressOf(p);
    const open = p.checkins.filter(c => !c.done).length;
    return `
    <a class="tcard p${p.palette} reveal" href="#/p/${p.id}" style="animation-delay:${Math.min(.10 + i*.04, .30)}s">
      ${watermark}
      <div class="avatar">${esc(initial(p.name))}</div>
      <h3>${esc(p.name)}</h3>
      <p class="role">${esc(p.role)}</p>
      ${donut(pg.pct, `var(--c${p.palette})`, 96)}
      <p class="count">${p.goals.length} goals &middot; ${open} open check-in${open===1?'':'s'}</p>
      ${arrowTag('Open')}
    </a>`;
  }).join('');

  return `
  <div class="page t-home">
    <!-- open sky: the title is lettered across it, not put in a card -->
    <div class="sky-gap" aria-hidden="true"></div>

    ${toolbar(`
      <span class="tb-label">Quick add</span>
      <button class="btn go" data-act="add-task" data-pri="1">+ Task</button>
      <button class="btn go" data-act="add-reminder">+ Reminder</button>
      <button class="btn go" data-act="add-entry">+ Expense</button>
      <button class="btn go" data-act="add-person">+ Team member</button>
      <button class="btn go" data-act="add-goal" data-p="${me.id}">+ My goal</button>
      <span class="spacer"></span>
      <a class="btn" href="#/review">Weekly review &rarr;</a>`)}

    <div class="tiles">
      ${tile(tasksOpen, 'My open tasks', tasksDone + ' completed', '#/tasks')}
      ${tile(team.length, 'Team members', allGoals + ' goals tracked', '#/team')}
      ${tile(DB.reminders.filter(r=>!r.done).length, 'Reminders', 'pending', '#/reminders')}
      ${tile('₹' + spend.toLocaleString('en-IN'), 'Spent so far', DB.budget.entries.length + ' entries', '#/budget')}
    </div>

    <div class="summary-grid">
      <div class="panel reveal">
        <div class="section-head" style="margin:0 0 12px">
          <h2>My tasks</h2><span class="spacer"></span>
          <a class="btn tiny" href="#/tasks">Open</a>
        </div>
        <div class="mini-cols">${topTasks}</div>
      </div>

      <div class="panel reveal">
        <div class="section-head" style="margin:0 0 12px">
          <h2>My progress</h2><span class="spacer"></span>
          <a class="btn tiny" href="#/p/${me.id}">My page</a>
        </div>
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          ${donut(mine.pct, 'var(--leaf-1)')}
          <div>
            <p style="margin:0;font-size:14px"><b>${mine.done}</b> of <b>${mine.total}</b> items done</p>
            <p class="muted" style="margin:4px 0 0">across ${me.goals.length} goals</p>
          </div>
        </div>
      </div>

      <div class="panel reveal">
        <div class="section-head" style="margin:0 0 12px">
          <h2>Coming up</h2><span class="spacer"></span>
          <a class="btn tiny" href="#/reminders">All reminders</a>
        </div>
        ${dueSoon.length ? dueSoon.map(r => `
          <div class="mini-row">
            <span class="dot s-plan"></span>
            <span class="t" title="${esc(r.title)}">${esc(r.title)}</span>
            <span class="m">${esc(r.date)}</span>
          </div>`).join('') : `<p class="muted">No reminders yet.</p>`}
      </div>
    </div>

    <div class="section-head reveal">
      <h2>Team</h2><span>Progress across everyone's goals</span>
      <span class="spacer"></span>
      <a class="btn tiny" href="#/team">Team page</a>
    </div>
    <div class="team-row">${teamStrip}</div>

    <div class="foot">Local file &middot; changes save automatically in this browser</div>
  </div>`;
}

/* ==========================================================
   MY TASKS — three priority columns
   ========================================================== */
function viewTasks(){
  const cols = PRIORITIES.map(pr => {
    const list = sortTasks(DB.myTasks.filter(t => t.priority === pr.n));
    const open = list.filter(t => t.status !== 'done').length;
    return `
    <section class="col p${pr.n===1?5:pr.n===2?3:2}">
      <header class="col-head">
        <div>
          <h3>${pr.label}</h3>
          <p>${pr.hint} &middot; ${open} open of ${list.length}</p>
        </div>
        <button class="btn tiny" data-act="add-task" data-pri="${pr.n}">+ Task</button>
      </header>
      <div class="col-body">
        ${list.length ? list.map(t => `
          <article class="task-card ${t.status==='done'?'is-done':''} pop" data-task="${t.id}">
            <div class="tc-top">
              ${monthSelect(`myTasks#${t.id}.month`, t.month)}
              ${taskSelect(`myTasks#${t.id}.status`, t.status)}
              <span class="spacer"></span>
              <button class="x" data-act="del-task" title="Remove">&times;</button>
            </div>
            <p class="tc-name">${ed(`myTasks#${t.id}.name`, t.name, 'Task name')}</p>
            <div class="tc-bot">
              ${chip(taskStatus(t.status))}
              <span class="spacer"></span>
              <select class="mini-sel" data-act="set-field" data-path="myTasks#${t.id}.priority" data-num="1">
                ${PRIORITIES.map(x => `<option value="${x.n}" ${x.n===t.priority?'selected':''}>P${x.n}</option>`).join('')}
              </select>
            </div>
          </article>`).join('')
        : `<div class="empty" style="padding:22px">No tasks here yet.</div>`}
      </div>
    </section>`;
  }).join('');

  return `
  <div class="page t-tasks">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>My Tasks</h1>
        <p class="sub">Completed tasks drop to the bottom automatically</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="add-task" data-pri="1">+ Add task to Priority 1</button>
      <button class="btn go" data-act="add-task" data-pri="2">+ Priority 2</button>
      <button class="btn go" data-act="add-task" data-pri="3">+ Priority 3</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

    <div class="cols">${cols}</div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   TEAM — grid of members
   ========================================================== */
function viewTeam(){
  const cards = DB.people.map((p,i) => {
    const pg = progressOf(p);
    const open = p.checkins.filter(c => !c.done).length;
    return `
    <a class="tcard p${p.palette} reveal" href="#/p/${p.id}" style="animation-delay:${Math.min(.06 + i*.04, .30)}s">
      ${watermark}
      <div class="avatar">${esc(initial(p.name))}</div>
      <h3>${esc(p.name)}</h3>
      <p class="role">${esc(p.role)}${p.lead?' &middot; me':''}</p>
      ${donut(pg.pct, `var(--c${p.palette})`, 104)}
      <p class="count">${p.goals.length} goals &middot; ${pg.done}/${pg.total} done</p>
      <ul class="pills">
        <li>${open} open check-in${open===1?'':'s'}</li>
        ${p.wins.length ? `<li>${p.wins.length} win${p.wins.length===1?'':'s'}</li>` : ''}
      </ul>
      ${arrowTag('Open')}
    </a>`;
  }).join('');

  return `
  <div class="page t-team">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>Team Members</h1>
        <p class="sub">${DB.people.length} people &middot; check-ins, goals and performance</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="add-person">+ Add team member</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

    <div class="team-row">${cards}</div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   ONE MEMBER — check-ins, goals, performance, meter
   ========================================================== */
function viewPerson(id){
  const p = person(id);
  if(!p) return `<div class="page t-team">${notFound('That team member is not here any more.')}</div>`;
  const pg = progressOf(p);
  const open = openCheckin(p);
  const past = p.checkins.filter(c => c.done).reverse();
  const base = `people#${p.id}`;

  const noteField = (c, key, label, ph) => `
    <div class="field">
      <label>${label}</label>
      <div class="box" data-edit="${base}.checkins#${c.id}.${key}" data-ph="${ph}"
           contenteditable="true" spellcheck="false">${esc(c[key])}</div>
    </div>`;

  const openCard = open ? `
    <div class="panel checkin-open">
      <div class="section-head" style="margin:0 0 4px">
        <h2>Current check-in</h2>
        <span class="spacer"></span>
        <span class="muted">Date ${ed(`${base}.checkins#${open.id}.date`, open.date, 'YYYY-MM-DD')}</span>
      </div>
      <p class="muted" style="margin:0 0 14px">Write your notes below. Marking it complete files it away and opens a fresh card for the next one.</p>
      <div class="two">
        ${noteField(open,'notes','Notes','What was discussed?')}
        ${noteField(open,'observations','Observations','What did you notice?')}
      </div>
      <div class="two">
        ${noteField(open,'priorities','Priorities for next week','What should they focus on?')}
        ${noteField(open,'improvement','Areas of improvement','Where can they grow?')}
      </div>
      ${noteField(open,'kpi','KPI / goal achievement update','Progress against goals')}
      <div class="row" style="margin-top:16px">
        <button class="btn green" data-act="complete-checkin" data-c="${open.id}">&#10003; Mark check-in complete</button>
      </div>
    </div>` : '';

  const history = past.length ? `
    <div class="section-head"><h2>Past check-ins</h2><span>${past.length} filed</span></div>
    ${past.map(c => `
      <details class="past">
        <summary><b>${esc(c.date)}</b> <span class="muted">${esc((c.notes||'').slice(0,90))}</span></summary>
        <div class="two">
          ${noteField(c,'notes','Notes','')}
          ${noteField(c,'observations','Observations','')}
        </div>
        <div class="two">
          ${noteField(c,'priorities','Priorities set','')}
          ${noteField(c,'improvement','Areas of improvement','')}
        </div>
        ${noteField(c,'kpi','KPI / goal update','')}
        <div class="row" style="margin-top:12px">
          <button class="btn tiny" data-act="reopen-checkin" data-c="${c.id}">Reopen</button>
          <button class="btn tiny danger" data-act="del-checkin" data-c="${c.id}">Delete</button>
        </div>
      </details>`).join('')}` : '';

  const goals = p.goals.map((g,i) => {
    const st = goalStatus(g.status);
    const dn = g.subtasks.filter(s => s.done).length;
    return `
    <article class="pcard p${p.palette} reveal" style="animation-delay:${Math.min(.04*i, .24)}s" data-goal="${g.id}">
      ${watermark}
      <h3>${ed(`${base}.goals#${g.id}.name`, g.name, 'Goal / KPI name')}</h3>
      <p class="obj">${ed(`${base}.goals#${g.id}.objective`, g.objective, 'Add the objective')}</p>
      <div class="card-foot">
        ${chip(st)}
        <span class="status">${dn}/${g.subtasks.length} subtasks</span>
        <span class="status">${g.comments.length} comments</span>
        <span class="spacer"></span>
        ${arrowBtn('Open')}
      </div>
    </article>`;
  }).join('');

  const listBlock = (kind, title, items, ph, cls) => `
    <div class="panel ${cls}">
      <div class="section-head" style="margin:0 0 12px">
        <h2>${title}</h2><span class="spacer"></span>
        <button class="btn tiny" data-act="add-${kind}">+ Add</button>
      </div>
      ${items.length ? items.map(w => `
        <div class="note-row" data-item="${w.id}">
          <span class="when">${esc(w.date)}</span>
          <span class="txt" data-edit="${base}.${kind}#${w.id}.text" data-ph="${ph}"
                contenteditable="true" spellcheck="false">${esc(w.text)}</span>
          <button class="x" type="button" data-act="del-${kind}"
                  aria-label="Remove this entry" title="Remove">&times;</button>
        </div>`).join('') : `<p class="muted">Nothing recorded yet.</p>`}
    </div>`;

  return `
  <div class="page t-team">
    ${banner({
      crumbs:`<a class="crumb" href="#/team" style="margin:0">&larr; Team Members</a>`,
      body:`
        <div class="ring" style="background:linear-gradient(140deg,var(--c${p.palette}a),var(--c${p.palette}b));color:var(--c${p.palette})">
          ${esc(initial(p.name))}
        </div>
        <div style="flex:1;min-width:190px">
          <h1>${ed(`${base}.name`, p.name, 'Name')}</h1>
          <p class="sub">${ed(`${base}.role`, p.role, 'Add role')}</p>
        </div>
        ${donut(pg.pct, `var(--c${p.palette})`, 104)}
        <div class="stat"><b>${p.kpis.length}</b><span>KPIs</span></div>
        <div class="stat"><b>${pg.kpi.counted ? pg.kpi.pct + '%' : '&ndash;'}</b><span>KPIs achieved</span></div>
        <div class="stat"><b>${p.goals.length}</b><span>goals</span></div>
        <div class="stat"><b>${past.length}</b><span>check-ins done</span></div>`
    })}

    ${toolbar(`
      <button class="btn go" data-act="add-wins">+ Record an achievement</button>
      <button class="btn" data-act="add-concerns">+ Area of improvement</button>
      <span class="spacer"></span>
      <span class="editnote">&#9998; Click any text to edit it</span>`)}

    ${kpisSyncPanel(p)}

    <div class="section-head reveal" style="animation-delay:.06s">
      <h2>Key goals &amp; KPIs <span class="muted">2026-27</span></h2>
      <span class="spacer"></span>
      <span class="muted">${pg.kpi.counted
        ? `${pg.kpi.achieved} of ${pg.kpi.planned} across ${pg.kpi.counted} measured KPI${pg.kpi.counted === 1 ? '' : 's'}`
        : `${p.kpis.length} KPI${p.kpis.length === 1 ? '' : 's'}`}${
        pg.kpi.untargeted ? ` &middot; ${pg.kpi.untargeted} without targets` : ''}</span>
      <button class="btn tiny" data-act="add-kpi" data-p="${p.id}">+ Add KPI</button>
    </div>
    ${kpiCards(p, base)}

    <div class="section-head reveal">
      <h2>Check-in conversation</h2>
    </div>
    ${openCard}
    ${history}

    <div class="section-head reveal">
      <h2>Goals &amp; projects</h2>
      <span class="spacer"></span>
      <button class="btn tiny" data-act="import-here">&#8681; Import goals</button>
      <button class="btn green" data-act="add-goal" data-p="${p.id}">+ Add goal</button>
    </div>
    ${p.goals.length ? `<div class="proj-grid">${goals}</div>`
      : emptyState('No goals or projects recorded for this member yet.',
          `<button class="btn go" data-act="add-goal" data-p="${p.id}">+ Add the first goal</button>`)}

    <div class="section-head reveal"><h2>Performance record</h2></div>
    <div class="two">
      ${listBlock('wins','Achievements &amp; strong performance', p.wins, 'What went well?','good')}
      ${listBlock('concerns','Areas of improvement &amp; concerns', p.concerns, 'What fell short?','bad')}
    </div>

    ${p.lead ? '' : `
      <div class="row" style="margin-top:24px">
        <button class="btn danger" data-act="del-person" data-p="${p.id}">Remove this member</button>
      </div>`}

    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   ONE GOAL — subtasks and comments
   ========================================================== */
function viewGoal(pid, gid){
  const p = person(pid);
  const g = goalOf(p, gid);
  if(!g) return `<div class="page t-team">${notFound('That goal is not here any more.')}</div>`;
  const base = `people#${p.id}.goals#${g.id}`;
  const st = goalStatus(g.status);
  const dn = g.subtasks.filter(s => s.done).length;
  const pct = g.subtasks.length ? Math.round(dn/g.subtasks.length*100) : 0;

  const subs = g.subtasks.map(s => `
    <div class="task ${s.done?'done':''} pop" data-sub="${s.id}">
      <input type="checkbox" ${s.done?'checked':''} data-act="toggle-sub">
      <span class="txt" data-edit="${base}.subtasks#${s.id}.text" data-ph="Subtask"
            contenteditable="true" spellcheck="false">${esc(s.text)}</span>
      <button class="x" type="button" data-act="del-sub"
              aria-label="Remove this subtask" title="Remove">&times;</button>
    </div>`).join('');

  const comments = g.comments.map(c => `
    <div class="comment pop" data-comment="${c.id}">
      <span class="when">${esc(c.date)}</span>
      <span class="txt" data-edit="${base}.comments#${c.id}.text" data-ph="Comment"
            contenteditable="true" spellcheck="false">${esc(c.text)}</span>
      <button class="x" type="button" data-act="del-comment"
              aria-label="Remove this comment" title="Remove">&times;</button>
    </div>`).join('');

  return `
  <div class="page t-team">
    ${banner({
      crumbs:`<a class="crumb" href="#/team" style="margin:0">Team</a>
              <span class="muted">/</span>
              <a class="crumb" href="#/p/${p.id}" style="margin:0">${esc(p.name)}</a>`,
      body:`
        <h1 style="flex:1;min-width:220px">${ed(base + '.name', g.name, 'Goal name')}</h1>
        ${chip(st)}`
    })}

    ${toolbar(`
      <label class="tb-label">Status</label>
      <select class="status-sel" data-act="set-goal-status" data-path="${base}.status">
        ${GOAL_STATUS.map(s => `<option value="${s.v}" ${s.v===g.status?'selected':''}>${s.label}</option>`).join('')}
      </select>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import subtasks</button>`)}

    <div class="detail-grid reveal">
      <div class="panel">
        <div class="field">
          <label>Objective / outcome</label>
          <div class="box" data-edit="${base}.objective" data-ph="What is this goal meant to achieve?"
               contenteditable="true" spellcheck="false">${esc(g.objective)}</div>
        </div>
        <div class="field">
          <label>Subtasks &mdash; ${dn} of ${g.subtasks.length} done</label>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div style="margin-top:12px">${subs || `<div class="empty" style="padding:18px">No subtasks yet.</div>`}</div>
          <button class="btn go" style="margin-top:10px" data-act="add-sub">+ Add subtask</button>
        </div>
      </div>

      <div class="panel">
        <div class="field">
          <label>Timeline</label>
          <div class="box" data-edit="${base}.timeline" data-ph="e.g. Jun 2026 – Mar 2027"
               contenteditable="true" spellcheck="false">${esc(g.timeline)}</div>
        </div>
        <div class="field">
          <label>Owner</label>
          <div><a class="btn tiny" href="#/p/${p.id}">${esc(p.name)}</a></div>
        </div>
        <div class="field">
          <label>Comments</label>
          ${comments || `<p class="muted">No comments yet.</p>`}
          <button class="btn go" style="margin-top:10px" data-act="add-comment">+ Add comment</button>
        </div>
        <div class="field">
          <label>Danger zone</label>
          <button class="btn danger" data-act="del-goal">Delete this goal</button>
        </div>
      </div>
    </div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   REMINDERS
   ========================================================== */
function viewReminders(){
  const list = [...DB.reminders].sort((a,b) =>
    (a.done?1:0) - (b.done?1:0) || String(a.date).localeCompare(String(b.date)));
  const now = today();

  const rows = list.map(r => {
    const late = !r.done && r.date && r.date < now;
    return `
    <tr class="${r.done?'is-done':''} ${late?'is-late':''}" data-rem="${r.id}">
      <td><input type="checkbox" ${r.done?'checked':''} data-act="toggle-reminder"
                 aria-label="Mark \"${esc(r.title)}\" as done"></td>
      <td>${ed(`reminders#${r.id}.date`, r.date, 'YYYY-MM-DD')}</td>
      <td>${ed(`reminders#${r.id}.title`, r.title, 'What is it?')}</td>
      <td>${ed(`reminders#${r.id}.who`, r.who, 'Who?')}</td>
      <td>${ed(`reminders#${r.id}.note`, r.note, 'Any detail')}</td>
      <td>${late?`<span class="status s-risk">Overdue</span>`
              :r.done?`<span class="status s-done">Done</span>`
              :`<span class="status s-plan">Pending</span>`}</td>
      <td><button class="x" type="button" data-act="del-reminder"
              aria-label="Remove this reminder" title="Remove">&times;</button></td>
    </tr>`;
  }).join('');

  return `
  <div class="page t-rem">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>Reminders</h1>
        <p class="sub">${DB.reminders.filter(r=>!r.done).length} pending &middot; overdue ones are flagged</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="add-reminder">+ Add reminder</button>
      <span class="spacer"></span>
      <button class="btn" data-act="import-here">&#8681; Import Excel / CSV</button>
      <button class="btn" data-act="export-here">&#8679; Export CSV</button>`)}

    <div class="panel reveal" style="padding:14px">
      ${list.length ? `
      <p class="table-note">Scroll the table sideways to see every column.</p>
      <div class="table-wrap">
        <table class="grid-table">
          <thead><tr><th><span class="sr-only">Done</span></th><th>Date</th><th>Reminder</th>
                     <th>Who</th><th>Note</th><th>Status</th>
                     <th><span class="sr-only">Remove</span></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : emptyState('No reminders yet.',
        `<button class="btn go" data-act="add-reminder">+ Add your first reminder</button>`)}
    </div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

/* ==========================================================
   BUDGET
   ========================================================== */
function viewBudget(){
  const entries = [...DB.budget.entries].sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const total = entries.reduce((n,e) => n + (Number(e.amount)||0), 0);
  const money = n => '₹' + (Number(n)||0).toLocaleString('en-IN');

  const byHead = {};
  entries.forEach(e => { byHead[e.head || 'Other'] = (byHead[e.head || 'Other'] || 0) + (Number(e.amount)||0); });
  const heads = Object.keys(byHead).sort((a,b) => byHead[b] - byHead[a]);

  const rows = entries.map(e => `
    <tr data-entry="${e.id}">
      <td>${ed(`budget.entries#${e.id}.date`, e.date, 'YYYY-MM-DD')}</td>
      <td>${ed(`budget.entries#${e.id}.title`, e.title, 'What was it for?')}</td>
      <td class="num">${ed(`budget.entries#${e.id}.amount`, e.amount, '0', 'span', '', true)}</td>
      <td>${ed(`budget.entries#${e.id}.by`, e.by, 'Who spent it')}</td>
      <td>
        <select class="mini-sel" data-act="set-field" data-path="budget.entries#${e.id}.head">
          ${DB.budget.heads.map(h => `<option ${h===e.head?'selected':''}>${esc(h)}</option>`).join('')}
        </select>
      </td>
      <td><button class="x" data-act="del-entry">&times;</button></td>
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
      <div class="tile"><b>${money(total)}</b><span>Total spend</span></div>
      ${heads.slice(0,3).map(h => `<div class="tile"><b>${money(byHead[h])}</b><span>${esc(h)}</span></div>`).join('')}
    </div>

    <div class="panel reveal" style="padding:14px">
      ${entries.length ? `
      <div class="table-wrap">
        <table class="grid-table">
          <thead><tr><th>Date</th><th>Expense title</th><th class="num">Amount</th>
                     <th>Expense by</th><th>Budget head</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><th colspan="2">Total</th><th class="num">${money(total)}</th><th colspan="3"></th></tr></tfoot>
        </table>
      </div>` : `<div class="empty">No expenses recorded yet.</div>`}
    </div>

    <div class="panel reveal" style="margin-top:16px">
      <div class="section-head" style="margin:0 0 12px">
        <h2>Budget heads</h2><span class="spacer"></span>
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

/* ==========================================================
   SETTINGS  (includes the spreadsheet import)
   ========================================================== */
function viewSettings(){
  const me = theLead();
  return `
  <div class="page t-set">
    ${banner({ body:`
      <div style="flex:1;min-width:220px">
        <h1>Settings</h1>
        <p class="sub">Site details, spreadsheet import and backups</p>
      </div>` })}

    ${toolbar(`
      <button class="btn go" data-act="export">Export backup</button>
      <button class="btn" data-act="import-json">Restore backup</button>
      <button class="btn" data-act="selftest">Test buttons</button>
      <span class="spacer"></span>
      <button class="btn danger" data-act="reset">Reset everything</button>`)}

    <div id="selftest-out"></div>

    <div class="detail-grid">

      <div class="panel reveal">
        <h3>Import from a spreadsheet</h3>
        <p class="muted" style="margin-top:0">
          Two ways in: pick a <b>.csv</b> file, or simply select the cells in Excel,
          press Ctrl+C, and paste them into the box below. The first row must be your
          column headings &mdash; things like Month, Task, Status, Priority, Date,
          Amount, Expense by, Budget head. Headings are matched automatically.
        </p>

        <div class="field">
          <label>Put the rows into</label>
          <select class="status-sel" id="imp-target">
            <option value="myTasks">My Tasks</option>
            <option value="goals">Goals / KPIs for a team member</option>
            <option value="reminders">Reminders</option>
            <option value="budget">Budget entries</option>
          </select>
          <select class="status-sel" id="imp-person" style="margin-left:8px;display:none">
            ${DB.people.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>Choose a CSV file</label>
          <input type="file" id="imp-file" accept=".csv,.txt,.tsv">
        </div>

        <div class="field">
          <label>…or paste rows copied from Excel</label>
          <textarea id="imp-text" rows="7" placeholder="Month	Task	Status	Priority
August	Visit Mysore schools	In progress	1
August	Submit donor report	Not started	2"></textarea>
        </div>

        <div class="row">
          <button class="btn" data-act="imp-preview">Preview</button>
          <button class="btn green" data-act="imp-apply">Import</button>
        </div>
        <div id="imp-preview"></div>
      </div>

      <div class="panel reveal">
        <h3>Site details</h3>
        <div class="field">
          <label>Site title</label>
          <div class="box" data-edit="meta.title" data-ph="Work Station"
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
          Your data lives in this browser. Export saves a real file you can keep safely.
        </p>
        <div class="row">
          <button class="btn" data-act="export">Export backup</button>
          <button class="btn" data-act="import-json">Restore backup</button>
          <button class="btn danger" data-act="reset">Reset everything</button>
        </div>
      </div>

    </div>
    <div class="foot">Changes save automatically</div>
  </div>`;
}

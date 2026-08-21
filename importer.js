/* ==========================================================
   Project Tracker — bring a spreadsheet into any section
   ----------------------------------------------------------
   One window, opened from whichever page you are on, so the
   rows land in that section without you choosing a target.

   Takes .xlsx straight from Excel, .csv, .tsv, or cells
   pasted out of Excel. Everything stays on this computer.
   ========================================================== */

/* ==========================================================
   What each section can receive
   ---------------------------------------------------------
   key      → the field we store
   label    → what the mapping row calls it
   hint     → column headings that usually mean this field
   required → at least this one must be mapped
   ========================================================== */
const IMPORT_TARGETS = {
  myTasks: {
    label: 'My Tasks',
    goto: '#/tasks',
    fields: [
      { key:'name',     label:'Task name',  required:true },
      { key:'month',    label:'Month' },
      { key:'status',   label:'Status' },
      { key:'priority', label:'Priority (1-3)' },
      { key:'due',      label:'Due date' },
      { key:'note',     label:'Note' }
    ],
    build: g => ({
      id: uid('t'),
      name: g('name'),
      month: guessMonth(g('month') || g('due')),
      status: guessTaskStatus(g('status')),
      priority: clampPriority(g('priority')),
      due: cleanDate(g('due')),
      note: g('note')
    })
  },

  goals: {
    label: 'Goals / KPIs',
    needsPerson: true,
    goto: null,                      /* worked out from the chosen person */
    fields: [
      { key:'name',      label:'Goal name', required:true },
      { key:'objective', label:'Objective' },
      { key:'timeline',  label:'Timeline' },
      { key:'status',    label:'Status' }
    ],
    build: g => ({
      id: uid('g'),
      name: g('name'),
      objective: g('objective'),
      timeline: g('timeline'),
      status: guessGoalStatus(g('status')),
      comments: [], subtasks: []
    })
  },

  reminders: {
    label: 'Reminders',
    goto: '#/reminders',
    fields: [
      { key:'title',  label:'Reminder', required:true },
      { key:'date',   label:'Date' },
      { key:'who',    label:'Who' },
      { key:'note',   label:'Note' },
      { key:'status', label:'Done?' }
    ],
    build: g => ({
      id: uid('r'),
      title: g('title'),
      date: cleanDate(g('date')) || today(),
      who: g('who'),
      note: g('note'),
      done: guessTaskStatus(g('status')) === 'done'
    })
  },

  budget: {
    label: 'Budget entries',
    goto: '#/budget',
    /* the same order as the columns on the Budget page */
    fields: [
      { key:'date',       label:'Date' },
      { key:'title',      label:'Expense Title', required:true },
      { key:'amount',     label:'Amount' },
      { key:'vendor',     label:'Vendor' },
      { key:'by',         label:'By (M4C emp)', avoid:['approv'] },
      { key:'head',       label:'Budget Head' },
      { key:'approvedBy', label:'Approved by' }
    ],
    build: g => ({
      id: uid('b'),
      date: cleanDate(g('date')) || today(),
      title: g('title'),
      amount: money(g('amount')),
      vendor: g('vendor'),
      by: g('by'),
      head: g('head') || 'Other',
      approvedBy: g('approvedBy')
    })
  },

  people: {
    label: 'Team members',
    goto: '#/team',
    fields: [
      { key:'name', label:'Name', required:true },
      { key:'role', label:'Role' }
    ],
    build: (g, i) => {
      const p = blankPerson(g('name'), (i % 6) + 1);
      if(g('role')) p.role = g('role');
      return p;
    }
  },

  subtasks: {
    label: 'Subtasks',
    goto: null,
    fields: [
      { key:'text',   label:'Subtask', required:true },
      { key:'status', label:'Done?' }
    ],
    build: g => ({ id: uid('s'), text: g('text'), done: guessTaskStatus(g('status')) === 'done' })
  }
};

/* ---------- tidying values ---------- */
function clampPriority(raw){
  const n = parseInt(String(raw).replace(/[^0-9]/g,''), 10);
  return (n >= 1 && n <= 3) ? n : 1;
}
function money(raw){
  return parseFloat(String(raw).replace(/[^0-9.\-]/g,'')) || 0;
}
/* accept 2026-08-20, 20/08/2026, 20-Aug-2026, or an Excel date already converted */
function cleanDate(raw){
  const s = String(raw || '').trim();
  if(!s) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if(m){
    let [, d, mo, y] = m;
    if(y.length === 2) y = '20' + y;
    /* day first — the usual way of writing dates here */
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  /* things like "20-Aug-2026": read it, then write it back using the
     local date parts so the time zone cannot shift it by a day */
  const t = Date.parse(s);
  if(!isNaN(t)){
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
                           + '-' + String(d.getDate()).padStart(2,'0');
  }
  return s;
}

/* ==========================================================
   State while the window is open
   ========================================================== */
const IMP = {
  target: 'myTasks',
  personId: null,
  goalId: null,
  sheets: [],        /* when an Excel file has more than one tab */
  sheetIx: 0,
  rows: [],
  hasHeader: true,
  map: {},           /* field key → column number, or undefined */
  mode: 'add',       /* 'add' or 'replace' */
  skipDupes: true,
  source: ''
};

/* ==========================================================
   Open the window
   openImport('myTasks')                  from the Tasks page
   openImport('goals', personId)          from a member's page
   openImport('subtasks', pid, gid)       from a goal page
   ========================================================== */
function openImport(target, personId, goalId){
  const t = IMPORT_TARGETS[target];
  if(!t) return;

  IMP.target = target;
  IMP.personId = personId || (DB.people[0] && DB.people[0].id);
  IMP.goalId = goalId || null;
  IMP.sheets = []; IMP.sheetIx = 0; IMP.rows = [];
  IMP.hasHeader = true; IMP.map = {}; IMP.mode = 'add';
  IMP.skipDupes = true; IMP.source = '';

  const personPicker = t.needsPerson ? `
    <div class="field">
      <label>Whose goals are these?</label>
      <select class="status-sel" id="imp-person">
        ${DB.people.map(p => `<option value="${p.id}" ${p.id===IMP.personId?'selected':''}>${esc(p.name)}</option>`).join('')}
      </select>
    </div>` : '';

  openModal(`Import into ${t.label}`, `
    <div class="imp">
      ${personPicker}

      <div class="dropzone" id="imp-drop" tabindex="0">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <b>Drop an Excel or CSV file here</b>
        <span>or <u>click to choose</u> &middot; .xlsx, .csv, .tsv</span>
        <input type="file" id="imp-file" accept=".xlsx,.csv,.tsv,.txt" hidden>
      </div>

      <details class="imp-paste">
        <summary>…or paste rows copied from Excel</summary>
        <textarea id="imp-text" rows="6" placeholder="Task	Status	Priority	Due
Visit Mysore schools	In progress	1	2026-09-05"></textarea>
        <button class="btn tiny" id="imp-readpaste">Read pasted rows</button>
      </details>

      <div id="imp-stage"></div>
    </div>
  `, {
    wide: true,
    foot: `<span class="imp-foot-note" id="imp-count"></span>
           <span class="spacer"></span>
           <button class="btn" id="imp-cancel">Cancel</button>
           <button class="btn green" id="imp-go" disabled>Save</button>`
  });

  wireImportModal();
}

/* ==========================================================
   Hook up the window
   ========================================================== */
function wireImportModal(){
  const drop = document.getElementById('imp-drop');
  const file = document.getElementById('imp-file');
  const pick = document.getElementById('imp-person');

  if(pick) pick.onchange = () => { IMP.personId = pick.value; };

  drop.onclick = () => file.click();
  drop.onkeydown = e => { if(e.key === 'Enter' || e.key === ' ') file.click(); };
  file.onchange = () => { if(file.files[0]) takeFile(file.files[0]); };

  ['dragenter','dragover'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if(f) takeFile(f);
  });

  document.getElementById('imp-readpaste').onclick = () => {
    const text = document.getElementById('imp-text').value.trim();
    if(!text){ toast('Nothing pasted yet', {kind:'warn'}); return; }
    IMP.source = 'pasted rows';
    IMP.sheets = [];
    setRows(parseTable(text));
  };

  document.getElementById('imp-cancel').onclick = closeModal;
  document.getElementById('imp-go').onclick = applyImportNow;
}

/* ---------- read whichever kind of file was given ---------- */
async function takeFile(f){
  const stage = document.getElementById('imp-stage');
  stage.innerHTML = `<p class="muted">Reading ${esc(f.name)}…</p>`;
  IMP.source = f.name;

  try{
    if(isOldExcel(f.name))
      throw new Error('That is an old .xls file. Open it in Excel and use Save As → .xlsx or .csv, then try again.');

    if(isExcel(f.name)){
      const wb = await readWorkbook(f);
      IMP.sheets = wb.sheets;
      IMP.sheetIx = 0;
      setRows(wb.sheets[0].rows);
    } else {
      const text = await f.text();
      IMP.sheets = [];
      setRows(parseTable(text));
    }
  }catch(err){
    stage.innerHTML = `<p class="warn-inline">${esc(err.message || 'That file could not be read.')}</p>`;
    document.getElementById('imp-go').disabled = true;
  }
}

/* ---------- rows are in; guess the mapping and draw ---------- */
function setRows(rows){
  IMP.rows = rows || [];
  if(IMP.rows.length < 1){
    document.getElementById('imp-stage').innerHTML =
      `<p class="warn-inline">No rows with any content were found.</p>`;
    return;
  }
  IMP.hasHeader = looksLikeHeader(IMP.rows[0]);
  IMP.map = autoMap();
  drawStage();
}

/* a heading row is usually text, with no numbers in it */
function looksLikeHeader(row){
  if(!row) return false;
  const numeric = row.filter(c => c !== '' && !isNaN(Number(c))).length;
  return numeric === 0;
}

/* match column headings to our fields using the hints in data.js */
function autoMap(){
  const t = IMPORT_TARGETS[IMP.target];
  const map = {};
  if(!IMP.hasHeader){
    /* no headings — put the first column into the required field */
    const req = t.fields.find(f => f.required);
    if(req) map[req.key] = 0;
    return map;
  }

  const head = IMP.rows[0].map(h => String(h).toLowerCase().trim());
  const used = new Set();

  t.fields.forEach(f => {
    const hints = HEADER_HINTS[f.key] || [f.key];
    const extra = f.key === 'due' ? ['due','deadline','by when','target date'] : [];
    const all = [...hints, ...extra, f.label.toLowerCase()];
    for(let i = 0; i < head.length; i++){
      if(used.has(i) || !head[i]) continue;
      /* some headings look alike: "By" must not grab "Approved by" */
      if(f.avoid && f.avoid.some(bad => head[i].includes(bad))) continue;
      if(all.some(h => head[i] === h || head[i].includes(h))){
        map[f.key] = i; used.add(i); break;
      }
    }
  });

  /* still nothing in the required field? fall back to the first spare column */
  const req = t.fields.find(f => f.required);
  if(req && map[req.key] === undefined){
    for(let i = 0; i < head.length; i++) if(!used.has(i)){ map[req.key] = i; break; }
  }
  return map;
}

/* ==========================================================
   Draw the mapping controls and the preview
   ========================================================== */
function drawStage(){
  const t = IMPORT_TARGETS[IMP.target];
  const head = IMP.hasHeader ? IMP.rows[0] : [];
  const cols = Math.max(...IMP.rows.map(r => r.length));

  const colName = i => IMP.hasHeader && head[i]
    ? `${esc(head[i])}  (col ${i+1})`
    : `Column ${i+1}`;

  const sheetPicker = IMP.sheets.length > 1 ? `
    <div class="field">
      <label>Which sheet?</label>
      <select class="status-sel" id="imp-sheet">
        ${IMP.sheets.map((s,i) =>
          `<option value="${i}" ${i===IMP.sheetIx?'selected':''}>${esc(s.name)} — ${s.rows.length} rows</option>`).join('')}
      </select>
    </div>` : '';

  const mapRows = t.fields.map(f => `
    <div class="map-row">
      <span class="map-lab">${esc(f.label)}${f.required?' <em>*</em>':''}</span>
      <select class="mini-sel map-sel" data-field="${f.key}">
        <option value="">— leave empty —</option>
        ${Array.from({length:cols}, (_,i) =>
          `<option value="${i}" ${IMP.map[f.key]===i?'selected':''}>${colName(i)}</option>`).join('')}
      </select>
    </div>`).join('');

  document.getElementById('imp-stage').innerHTML = `
    <div class="imp-loaded">
      <p class="ok-inline">Read ${IMP.rows.length} row${IMP.rows.length===1?'':'s'} from ${esc(IMP.source || 'your file')}.</p>

      ${sheetPicker}

      <label class="check">
        <input type="checkbox" id="imp-header" ${IMP.hasHeader?'checked':''}>
        The first row holds column headings
      </label>

      <div class="field">
        <label>Match your columns to the tracker</label>
        <div class="map-grid">${mapRows}</div>
      </div>

      <div class="field">
        <label>Preview</label>
        <div id="imp-prev"></div>
      </div>

      <div class="field">
        <label>How should these be added?</label>
        <div class="row">
          <label class="check"><input type="radio" name="impmode" value="add" ${IMP.mode==='add'?'checked':''}> Add to what is already there</label>
          <label class="check"><input type="radio" name="impmode" value="replace" ${IMP.mode==='replace'?'checked':''}> Replace everything in this section</label>
        </div>
        <label class="check" style="margin-top:8px">
          <input type="checkbox" id="imp-dupes" ${IMP.skipDupes?'checked':''}>
          Skip rows that are already in the tracker
        </label>
      </div>

      <div class="imp-actions">
        <button class="btn green big" id="imp-save">Save into ${esc(t.label)}</button>
        <button class="btn" id="imp-close">Cancel</button>
        <span class="hint" id="imp-hint"></span>
      </div>
    </div>`;

  /* wire the controls we just drew */
  const sheet = document.getElementById('imp-sheet');
  if(sheet) sheet.onchange = () => {
    IMP.sheetIx = +sheet.value;
    setRows(IMP.sheets[IMP.sheetIx].rows);
  };

  document.getElementById('imp-header').onchange = e => {
    IMP.hasHeader = e.target.checked;
    IMP.map = autoMap();
    drawStage();
  };

  document.querySelectorAll('.map-sel').forEach(sel => {
    sel.onchange = () => {
      const v = sel.value;
      if(v === '') delete IMP.map[sel.dataset.field];
      else IMP.map[sel.dataset.field] = +v;
      drawPreview();
    };
  });

  document.querySelectorAll('[name="impmode"]').forEach(r => {
    /* redraw so the save button says "Save" or "Replace with" correctly */
    r.onchange = () => { IMP.mode = r.value; drawPreview(); };
  });
  document.getElementById('imp-dupes').onchange = e => {
    IMP.skipDupes = e.target.checked;
    drawPreview();
  };

  /* the save button inside the window, alongside the one in the footer */
  document.getElementById('imp-save').onclick = applyImportNow;
  document.getElementById('imp-close').onclick = closeModal;

  /* the drop area shrinks now that a file has been read, so the
     mapping, the preview and the save button all fit on screen */
  const drop = document.getElementById('imp-drop');
  if(drop) drop.classList.add('slim');

  drawPreview();
}

/* ---------- turn the mapping into records ---------- */
function buildRecords(){
  const t = IMPORT_TARGETS[IMP.target];
  const body = IMP.hasHeader ? IMP.rows.slice(1) : IMP.rows;
  const reqKey = (t.fields.find(f => f.required) || {}).key;

  const existing = new Set(existingKeys());
  const out = [];
  const skipped = [];

  body.forEach((row, i) => {
    const g = key => {
      const ix = IMP.map[key];
      return ix === undefined ? '' : String(row[ix] == null ? '' : row[ix]).trim();
    };
    if(reqKey && !g(reqKey)) return;               /* no title, no record */

    const rec = t.build(g, i);
    const k = recordKey(rec);

    if(IMP.skipDupes && existing.has(k)){ skipped.push(rec); return; }
    existing.add(k);
    out.push(rec);
  });

  return { records: out, skipped };
}

/* what counts as "the same row" — the title, lower-cased */
function recordKey(rec){
  return String(rec.name || rec.title || rec.text || '').toLowerCase().trim();
}
function existingKeys(){
  if(IMP.mode === 'replace') return [];
  if(IMP.target === 'myTasks')   return DB.myTasks.map(recordKey);
  if(IMP.target === 'reminders') return DB.reminders.map(recordKey);
  if(IMP.target === 'budget')    return DB.budget.entries.map(recordKey);
  if(IMP.target === 'people')    return DB.people.map(recordKey);
  if(IMP.target === 'goals'){
    const p = person(IMP.personId);
    return p ? p.goals.map(recordKey) : [];
  }
  if(IMP.target === 'subtasks'){
    const g = goalOf(person(IMP.personId), IMP.goalId);
    return g ? g.subtasks.map(recordKey) : [];
  }
  return [];
}

function drawPreview(){
  const host = document.getElementById('imp-prev');
  if(!host) return;
  const { records, skipped } = buildRecords();
  /* both save buttons - the one in the footer and the one in the body */
  const btns  = [document.getElementById('imp-go'), document.getElementById('imp-save')].filter(Boolean);
  const count = document.getElementById('imp-count');
  const hint  = document.getElementById('imp-hint');
  const label = IMPORT_TARGETS[IMP.target].label;

  if(!records.length){
    host.innerHTML = `<p class="warn-inline">Nothing usable yet — check the column matching above.</p>`;
    btns.forEach(b => { b.disabled = true; });
    const save = document.getElementById('imp-save');
    if(save) save.textContent = 'Nothing to save yet';
    if(count) count.textContent = skipped.length ? `${skipped.length} already in the tracker` : '';
    if(hint) hint.textContent = skipped.length
      ? `${skipped.length} row${skipped.length===1?'':'s'} already in the tracker`
      : 'Match at least the required column above.';
    return;
  }

  const cols = Object.keys(records[0]).filter(k => k !== 'id' && typeof records[0][k] !== 'object');
  const rows = records.slice(0,8).map(r =>
    `<tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('');

  host.innerHTML = `
    <div class="table-wrap">
      <table class="grid-table">
        <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${records.length > 8 ? `<p class="muted">…and ${records.length-8} more.</p>` : ''}
    ${skipped.length ? `<p class="muted">${skipped.length} row${skipped.length===1?'':'s'} skipped as already present.</p>` : ''}`;

  btns.forEach(b => { b.disabled = false; });
  const save = document.getElementById('imp-save');
  if(save) save.textContent =
    `${IMP.mode === 'replace' ? 'Replace with' : 'Save'} ${records.length} row${records.length===1?'':'s'} into ${label}`;
  if(count) count.textContent = `${records.length} row${records.length===1?'':'s'} ready`;
  if(hint) hint.textContent = skipped.length
    ? `${skipped.length} skipped as already present`
    : 'Nothing is added until you press Save.';
}

/* ==========================================================
   Do it
   ========================================================== */
function applyImportNow(){
  const { records } = buildRecords();
  if(!records.length) return;
  const t = IMPORT_TARGETS[IMP.target];

  /* keep a copy so the toast can offer an undo */
  const before = JSON.stringify(DB);

  if(IMP.target === 'myTasks'){
    if(IMP.mode === 'replace') DB.myTasks = [];
    DB.myTasks.unshift(...records);

  } else if(IMP.target === 'reminders'){
    if(IMP.mode === 'replace') DB.reminders = [];
    DB.reminders.unshift(...records);

  } else if(IMP.target === 'budget'){
    if(IMP.mode === 'replace') DB.budget.entries = [];
    DB.budget.entries.unshift(...records);
    records.forEach(r => {
      if(r.head && !DB.budget.heads.includes(r.head)) DB.budget.heads.push(r.head);
    });

  } else if(IMP.target === 'people'){
    if(IMP.mode === 'replace') DB.people = DB.people.filter(p => p.lead);
    DB.people.push(...records);

  } else if(IMP.target === 'goals'){
    const p = person(IMP.personId);
    if(!p){ toast('That team member could not be found', {kind:'warn'}); return; }
    if(IMP.mode === 'replace') p.goals = [];
    p.goals.push(...records);

  } else if(IMP.target === 'subtasks'){
    const g = goalOf(person(IMP.personId), IMP.goalId);
    if(!g){ toast('That goal could not be found', {kind:'warn'}); return; }
    if(IMP.mode === 'replace') g.subtasks = [];
    g.subtasks.push(...records);
  }

  normalise();
  save();
  closeModal();

  const where = IMP.target === 'goals' ? '#/p/' + IMP.personId
              : IMP.target === 'subtasks' ? `#/p/${IMP.personId}/g/${IMP.goalId}`
              : t.goto;
  if(where && location.hash !== where) location.hash = where; else render();

  /* if the browser is blocking storage the rows are only in memory,
     and saying "imported" would be a lie */
  if(!STORAGE_OK){
    toast(`${records.length} row${records.length===1?'':'s'} added, but NOT saved — `
        + `this browser is blocking storage. Export a backup before closing.`,
      { kind:'warn' });
  } else {
    toast(`${records.length} row${records.length===1?'':'s'} imported into ${t.label}`, {
      undo: () => { DB = JSON.parse(before); normalise(); }
    });
  }
}

/* ==========================================================
   The other direction — save a section as CSV
   Handy for sharing a list, or for editing in Excel and
   bringing it back in.
   ========================================================== */
function exportSection(target){
  const rows = [];
  const q = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };

  if(target === 'myTasks'){
    rows.push(['Task','Month','Status','Priority','Due','Note']);
    sortTasks(DB.myTasks).forEach(t => rows.push(
      [t.name, t.month, taskStatus(t.status).label, t.priority, t.due||'', t.note||'']));

  } else if(target === 'reminders'){
    rows.push(['Reminder','Date','Who','Note','Done']);
    DB.reminders.forEach(r => rows.push([r.title, r.date, r.who, r.note, r.done?'Yes':'No']));

  } else if(target === 'budget'){
    rows.push(['Date','Expense Title','Amount','Vendor','By (M4C emp)','Budget Head','Approved by']);
    DB.budget.entries.forEach(e => rows.push(
      [e.date, e.title, e.amount, e.vendor || '', e.by, e.head, e.approvedBy || '']));

  } else if(target === 'people'){
    rows.push(['Name','Role','Goals','Done','Total','Percent']);
    DB.people.forEach(p => {
      const pg = progressOf(p);
      rows.push([p.name, p.role, p.goals.length, pg.done, pg.total, pg.pct + '%']);
    });

  } else if(target === 'goals'){
    rows.push(['Member','Goal','Objective','Timeline','Status','Subtasks done','Subtasks total']);
    DB.people.forEach(p => p.goals.forEach(g => rows.push(
      [p.name, g.name, g.objective, g.timeline, goalStatus(g.status).label,
       g.subtasks.filter(s => s.done).length, g.subtasks.length])));
  }

  const csv = rows.map(r => r.map(q).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${target}-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Saved as CSV — opens straight in Excel');
}

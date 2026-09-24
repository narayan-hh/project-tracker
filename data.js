/* ==========================================================
   My Workstation — data model, storage, import
   Everything is local. Nothing is sent anywhere.
   ========================================================== */

const KEY = 'ptracker.v3';

/* ---------- vocabularies ---------- */
const TASK_STATUS = [
  { v:'todo', label:'Not started', cls:'s-plan' },
  { v:'wip',  label:'In progress', cls:'s-on'   },
  { v:'done', label:'Completed',   cls:'s-done' }
];
const GOAL_STATUS = [
  { v:'plan', label:'Planned',         cls:'s-plan' },
  { v:'on',   label:'On track',        cls:'s-on'   },
  { v:'risk', label:'Needs attention', cls:'s-risk' },
  { v:'hold', label:'On hold',         cls:'s-hold' },
  { v:'done', label:'Achieved',        cls:'s-done' }
];
const PRIORITIES = [
  { n:1, label:'Priority 1', hint:'Most important' },
  { n:2, label:'Priority 2', hint:'Important' },
  { n:3, label:'Priority 3', hint:'When there is room' }
];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

/* ---------- KPI periods ----------
   The programme year runs April to March, and the portfolio sheets lay
   the columns out in that order with a quarter total after every third
   month. Keep this array in that same order: the KPI table renders
   straight from it, so the screen matches the sheet column for column. */
const KPI_PERIODS = [
  { k:'apr', label:'Apr',  full:'April 2026',     type:'month'   },
  { k:'may', label:'May',  full:'May 2026',       type:'month'   },
  { k:'jun', label:'Jun',  full:'June 2026',      type:'month'   },
  { k:'q1',  label:'Q1',   full:'Quarter 1',      type:'quarter' },
  { k:'jul', label:'Jul',  full:'July 2026',      type:'month'   },
  { k:'aug', label:'Aug',  full:'August 2026',    type:'month'   },
  { k:'sep', label:'Sep',  full:'September 2026', type:'month'   },
  { k:'q2',  label:'Q2',   full:'Quarter 2',      type:'quarter' },
  { k:'oct', label:'Oct',  full:'October 2026',   type:'month'   },
  { k:'nov', label:'Nov',  full:'November 2026',  type:'month'   },
  { k:'dec', label:'Dec',  full:'December 2026',  type:'month'   },
  { k:'q3',  label:'Q3',   full:'Quarter 3',      type:'quarter' },
  { k:'jan', label:'Jan',  full:'January 2027',   type:'month'   },
  { k:'feb', label:'Feb',  full:'February 2027',  type:'month'   },
  { k:'mar', label:'Mar',  full:'March 2027',     type:'month'   },
  { k:'q4',  label:'Q4',   full:'Quarter 4',      type:'quarter' }
];

const uid = p => p + '-' + Math.random().toString(36).slice(2,9);
/* the date here, not in UTC — otherwise before 5.30am the app
   would think it was still yesterday and flag things as overdue */
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
                         + '-' + String(d.getDate()).padStart(2,'0');
};
const thisMonth = () => MONTHS[new Date().getMonth()];

const taskStatus = v => TASK_STATUS.find(s => s.v === v) || TASK_STATUS[0];
const goalStatus = v => GOAL_STATUS.find(s => s.v === v) || GOAL_STATUS[0];

/* the four quarters and the months each one covers, so a quarter can
   be worked out from its months when the sheet left the total blank */
const KPI_QUARTERS = [
  { k:'q1', label:'Q1', months:['apr','may','jun'] },
  { k:'q2', label:'Q2', months:['jul','aug','sep'] },
  { k:'q3', label:'Q3', months:['oct','nov','dec'] },
  { k:'q4', label:'Q4', months:['jan','feb','mar'] }
];

/* '' and text both mean "no figure"; 0 is a real figure */
function kpiNum(v){
  if(v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g,''));
  return isNaN(n) ? null : n;
}

/* one quarter's planned and achieved. The sheet's own quarter cell wins;
   failing that the three months are added up. null means nothing given. */
function kpiQuarter(k, q){
  const cell = (k.periods && k.periods[q.k]) || {};
  const out = {};
  ['planned','achieved'].forEach(side => {
    const own = kpiNum(cell[side]);
    if(own !== null){ out[side] = own; return; }
    let sum = null;
    q.months.forEach(m => {
      const v = kpiNum(((k.periods && k.periods[m]) || {})[side]);
      if(v !== null) sum = (sum === null ? 0 : sum) + v;
    });
    out[side] = sum;
  });
  return out;
}

/* the whole year for one KPI, added up from its four quarters */
function kpiRollup(k){
  let planned = null, achieved = null;
  const quarters = KPI_QUARTERS.map(q => {
    const v = kpiQuarter(k, q);
    if(v.planned  !== null) planned  = (planned  === null ? 0 : planned)  + v.planned;
    if(v.achieved !== null) achieved = (achieved === null ? 0 : achieved) + v.achieved;
    return { q, planned:v.planned, achieved:v.achieved };
  });
  const hasTarget = planned !== null && planned > 0;
  const pct = hasTarget
    ? Math.max(0, Math.min(100, Math.round((achieved || 0) / planned * 100)))
    : ((achieved || 0) > 0 ? 100 : 0);
  return { planned, achieved, quarters, hasTarget, pct };
}

/* a person's KPI standing. Only KPIs that actually carry a target are
   counted, so a sheet with the text filled in but no figures — which is
   how some portfolios arrive — does not drag the meter down to nothing. */
function kpiProgress(p){
  let counted = 0, sumPct = 0, planned = 0, achieved = 0;
  (p.kpis || []).forEach(k => {
    const r = kpiRollup(k);
    if(!r.hasTarget) return;
    counted++;
    sumPct  += r.pct;
    planned += r.planned;
    achieved += (r.achieved || 0);
  });
  return { counted, planned, achieved,
    pct: counted ? Math.round(sumPct / counted) : 0,
    untargeted: (p.kpis || []).length - counted };
}

/* ---------- blank records ---------- */
function blankCheckin(){
  return { id:uid('ci'), date:today(), done:false,
    notes:'', observations:'', priorities:'', improvement:'', kpi:'' };
}
function blankGoal(name){
  return { id:uid('g'), name:name||'New goal', objective:'', timeline:'',
    status:'plan', comments:[], subtasks:[] };
}
/* every period starts empty; '' means the sheet cell was blank, which
   is different from a planned target of 0 */
function blankKpiPeriods(){
  const o = {};
  KPI_PERIODS.forEach(p => { o[p.k] = { planned:'', achieved:'' }; });
  return o;
}
function blankKpi(name){
  return { id:uid('k'), area:'', name:name||'New KPI', note:'',
    periods: blankKpiPeriods() };
}

/* Build one KPI from a plain record in a data file or a backup.
   Every period cell is copied out by value. Object.assign would hand
   back the record's own cell objects, and then editing a figure in the
   app would reach into KPI_SEED and change the data file's copy in
   memory — which made a later refresh read back the edit as if it had
   come from the sheet. */
function kpiFrom(rec){
  const k = blankKpi(rec && rec.name);
  k.area = (rec && rec.area) || '';
  k.note = (rec && rec.note) || '';
  const src = (rec && rec.periods) || {};
  KPI_PERIODS.forEach(per => {
    const c = src[per.k] || {};
    k.periods[per.k] = {
      planned:  c.planned  == null ? '' : String(c.planned),
      achieved: c.achieved == null ? '' : String(c.achieved)
    };
  });
  return k;
}

/* ---------- seeding from kpi-data.local.js ----------
   That file is optional: on the public site it is not there at all,
   so KPI_SEED is undefined and this does nothing.

   Locally it carries a `stamp` taken over the figures themselves. The
   app remembers the last stamp it loaded, so re-reading a portfolio
   sheet and regenerating the file makes the new figures appear on the
   next refresh. Same stamp means same data, and nothing is touched —
   so your own edits in the app survive any number of reloads.

   When the stamp does change the sheet wins, because the portfolio
   workbook is the record and the app is the view of it. */
const nameKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'');

function seedKpisFromFile(){
  if(typeof KPI_SEED === 'undefined' || !KPI_SEED || !KPI_SEED.people) return null;

  const stamp = KPI_SEED.stamp || 'unstamped';
  if(DB.meta.kpiStamp === stamp) return null;
  const first = !DB.meta.kpiStamp;

  let loaded = 0, members = 0;
  Object.keys(KPI_SEED.people).forEach(name => {
    const list = KPI_SEED.people[name];
    if(!Array.isArray(list) || !list.length) return;

    /* the member by name, or a still-unused placeholder to rename,
       or a new member if neither is there */
    let p = DB.people.find(x => nameKey(x.name) === nameKey(name));
    if(!p){
      p = DB.people.find(x => /^teammate\d+$/.test(nameKey(x.name))
                           && !(x.kpis || []).length
                           && !(x.goals || []).length);
      if(p) p.name = name;
    }
    if(!p){
      p = blankPerson(name, (DB.people.length % 6) + 1);
      DB.people.push(p);
    }

    p.kpis = list.map(kpiFrom);
    loaded += p.kpis.length;
    members++;
  });

  DB.meta.kpiStamp = stamp;
  DB.meta.kpiSeeded = today();
  return { loaded, members, first };
}
function blankPerson(name, palette){
  return {
    id: (name||'member').toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Math.random().toString(36).slice(2,5),
    name: name || 'New member', role:'Role to be added', palette: palette || 1,
    goals:[], kpis:[], checkins:[ blankCheckin() ], wins:[], concerns:[]
  };
}

/* ---------- starting content ---------- */
function seed(){
  const P = (n,pal) => {
    const p = blankPerson(n,pal); p.id = n.toLowerCase(); return p;
  };
  const me = P('Narayan',1);
  me.role = 'Program Manager';
  me.lead = true;
  me.goals = ['CTP','WLC','YLC','YLC Mysore','ESI Mysore','LSC'].map(blankGoal);

  return {
    meta:{ title:'My Workstation', tagline:'Projects and team at a glance' },
    people:[ me, P('Teammate1',2), P('Teammate2',3), P('Teammate3',4),
             P('Teammate4',5), P('Teammate5',6) ],
    myTasks:[
      { id:uid('t'), month:thisMonth(), name:'Add your first priority 1 task', status:'todo', priority:1 },
      { id:uid('t'), month:thisMonth(), name:'Add your first priority 2 task', status:'todo', priority:2 },
      { id:uid('t'), month:thisMonth(), name:'Add your first priority 3 task', status:'todo', priority:3 }
    ],
    reminders:[],
    budget:{
      heads:['Travel','Training','Materials','Honorarium','Office','Other'],
      entries:[]
    }
  };
}

/* ==========================================================
   Storage  (+ detects when saving is not working)
   ========================================================== */
let DB;
let STORAGE_OK = true;

function storageWorks(){
  try{
    const probe = '__pt_probe__';
    localStorage.setItem(probe,'1');
    localStorage.removeItem(probe);
    return true;
  }catch(e){ return false; }
}

function load(){
  STORAGE_OK = storageWorks();
  try{
    const raw = STORAGE_OK ? localStorage.getItem(KEY) : null;
    DB = raw ? JSON.parse(raw) : migrateOrSeed();
  }catch(e){ DB = seed(); }
  normalise();
}

/* bring across anything saved by the earlier version of the site */
function migrateOrSeed(){
  try{
    const old = localStorage.getItem('ptracker.v2');
    if(!old) return seed();
    const o = JSON.parse(old);
    const fresh = seed();
    fresh.meta = o.meta || fresh.meta;
    fresh.people = (o.people||[]).map(p => ({
      id:p.id, name:p.name, role:p.role, palette:p.palette, lead:p.lead,
      goals:(p.projects||[]).map(pr => ({
        id:pr.id, name:pr.name, objective:pr.objective || '',
        timeline:pr.timeline || '', status:pr.status === 'done' ? 'done' : (pr.status || 'plan'),
        comments:[], subtasks:(pr.tasks||[]).map(t => ({id:t.id,text:t.text,done:t.done}))
      })),
      checkins:[ blankCheckin() ], wins:[], concerns:[]
    }));
    if(!fresh.people.length) fresh.people = seed().people;
    return fresh;
  }catch(e){ return seed(); }
}

/* make sure every record has every field, whatever version it came from */
function normalise(){
  if(!DB.meta) DB.meta = { title:'My Workstation', tagline:'' };
  /* renamed: carry old saved data over to the new name */
  if(DB.meta.title === 'Project Tracker' || DB.meta.title === 'Work Station') DB.meta.title = 'My Workstation';
  if(!Array.isArray(DB.people)) DB.people = seed().people;
  if(!Array.isArray(DB.myTasks)) DB.myTasks = [];
  if(!Array.isArray(DB.reminders)) DB.reminders = [];
  if(!DB.budget) DB.budget = { heads:['Travel','Other'], entries:[] };
  if(!Array.isArray(DB.budget.heads)) DB.budget.heads = ['Travel','Other'];
  if(!Array.isArray(DB.budget.entries)) DB.budget.entries = [];
  /* vendor and approved-by were added later, so fill them in on old entries */
  DB.budget.entries.forEach(e => {
    if(e.program    === undefined) e.program = '';
    if(e.vendor     === undefined) e.vendor = '';
    if(e.approvedBy === undefined) e.approvedBy = '';
  });

  DB.people.forEach((p,i) => {
    p.palette = p.palette || (i % 6) + 1;
    p.goals    = Array.isArray(p.goals) ? p.goals : [];
    p.wins     = Array.isArray(p.wins) ? p.wins : [];
    p.concerns = Array.isArray(p.concerns) ? p.concerns : [];
    p.checkins = Array.isArray(p.checkins) ? p.checkins : [];
    if(!p.checkins.some(c => !c.done)) p.checkins.push(blankCheckin());
    p.goals.forEach(g => {
      g.comments = Array.isArray(g.comments) ? g.comments : [];
      g.subtasks = Array.isArray(g.subtasks) ? g.subtasks : [];
    });
    /* kpis arrived after the first release, so older saved data and
       older backups will not have them */
    p.kpis = Array.isArray(p.kpis) ? p.kpis : [];
    p.kpis.forEach(k => {
      if(k.area === undefined) k.area = '';
      if(k.note === undefined) k.note = '';
      if(!k.id) k.id = uid('k');
      if(!k.periods || typeof k.periods !== 'object') k.periods = blankKpiPeriods();
      /* fill in any period the saved copy is missing, and make sure both
         halves of every pair exist so the table never renders undefined */
      KPI_PERIODS.forEach(per => {
        const cell = k.periods[per.k];
        if(!cell || typeof cell !== 'object'){ k.periods[per.k] = { planned:'', achieved:'' }; return; }
        if(cell.planned  === undefined || cell.planned  === null) cell.planned  = '';
        if(cell.achieved === undefined || cell.achieved === null) cell.achieved = '';
      });
    });
  });
  DB.myTasks.forEach(t => {
    t.priority = Number(t.priority) || 1;
    if(t.due  === undefined) t.due  = '';
    if(t.note === undefined) t.note = '';
    if(t.doneAt === undefined) t.doneAt = '';
  });
}

function save(){
  if(!STORAGE_OK) return;
  try{ localStorage.setItem(KEY, JSON.stringify(DB)); }
  catch(e){ STORAGE_OK = false; showStorageWarning(); }
}

/* ==========================================================
   Lookups
   ========================================================== */
const person   = id => DB.people.find(p => p.id === id);
const theLead  = () => DB.people.find(p => p.lead) || DB.people[0];
const teamOnly = () => DB.people.filter(p => !p.lead);
const goalOf   = (p, gid) => p && p.goals.find(g => g.id === gid);
const openCheckin = p => p.checkins.find(c => !c.done);

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const initial = n => (n || '?').trim().charAt(0).toUpperCase() || '?';

/* How far along is this person?
   Two pools feed the meter: goals (their subtasks, or the goal itself
   when it has none) and KPIs (achieved against target). Each pool is
   weighted by how many items it holds, so somebody carrying 21 KPIs
   and no goals reads as their KPI standing, and somebody with both
   gets a blend in proportion. `done` and `total` stay as they were —
   they count goal items, which is what the labels beside them say. */
function progressOf(p){
  let total = 0, done = 0;
  p.goals.forEach(g => {
    if(g.subtasks.length){
      total += g.subtasks.length;
      done  += g.subtasks.filter(s => s.done).length;
    } else {
      total += 1;
      if(g.status === 'done') done += 1;
    }
  });

  const kpi = kpiProgress(p);
  const pools = [];
  if(total)       pools.push({ pct: done / total * 100, w: total });
  if(kpi.counted) pools.push({ pct: kpi.pct,            w: kpi.counted });

  const w = pools.reduce((s,x) => s + x.w, 0);
  const pct = w ? Math.round(pools.reduce((s,x) => s + x.pct * x.w, 0) / w) : 0;

  return { total, done, pct, kpi };
}

/* tasks: not-started and in-progress first, completed sink to the bottom */
function sortTasks(list){
  return [...list].sort((a,b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
}

/* ==========================================================
   Generic path editing
   "people#narayan.goals#g-1.name"  →  DB.people[id=narayan].goals[id=g-1].name
   ========================================================== */
function resolvePath(path){
  const parts = path.split('.');
  let obj = DB;
  for(let i = 0; i < parts.length - 1; i++){
    const seg = parts[i];
    if(seg.includes('#')){
      const [k,id] = seg.split('#');
      obj = (obj[k] || []).find(x => x.id === id);
    } else {
      obj = obj[seg];
    }
    if(!obj) return null;
  }
  return { obj, key: parts[parts.length - 1] };
}
function setPath(path, value, asNumber){
  const r = resolvePath(path);
  if(!r) return;
  r.obj[r.key] = asNumber ? (parseFloat(String(value).replace(/[^0-9.\-]/g,'')) || 0) : value;
}

/* ==========================================================
   Import from a spreadsheet
   Accepts CSV, or rows pasted straight out of Excel (tab separated).
   ========================================================== */
function detectDelimiter(text){
  const line = text.split(/\r?\n/).find(l => l.trim()) || '';
  const tabs = (line.match(/\t/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  if(tabs >= semis && tabs >= commas && tabs > 0) return '\t';
  if(semis > commas) return ';';
  return ',';
}

/* a CSV parser that copes with quoted fields containing commas */
function parseTable(text){
  const d = detectDelimiter(text);
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if(c === '"'){ inQuotes = true; }
    else if(c === d){ row.push(field); field = ''; }
    else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
    else if(c === '\r'){ /* skip */ }
    else field += c;
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''))
             .map(r => r.map(c => c.trim()));
}

/* match a spreadsheet heading to a field we understand */
const HEADER_HINTS = {
  month:    ['month'],
  name:     ['task','name','title','activity','description','item','goal','expense','particular'],
  status:   ['status','progress','state'],
  priority: ['priority','pri','p'],
  person:   ['person','member','owner','who','assigned','responsible','by','team member','expense by'],
  date:     ['date','due','deadline','on'],
  amount:   ['amount','cost','value','spend','expense amount','rs','inr'],
  program:  ['program','program name','programme','project','scheme','initiative'],
  head:     ['head','budget head','category','type','account'],
  note:      ['note','notes','remark','comment','detail'],
  due:       ['due','due date','deadline','by when','target date','complete by'],
  title:     ['reminder','title','what','task','name','item','expense','particular','description'],
  who:       ['who','person','member','owner','assigned','responsible','for whom'],
  by:        ['by','spent by','expense by','paid by','person','who'],
  objective: ['objective','outcome','purpose','aim','description'],
  timeline:  ['timeline','period','duration','when','dates'],
  role:      ['role','designation','position'],
  vendor:    ['vendor','supplier','shop','paid to','payee','firm','agency','store'],
  approvedBy:['approved by','approver','approved','sanctioned by','authorised by','authorized by','approval'],
  text:      ['subtask','step','activity','item','task','name']
};
function mapHeaders(headerRow){
  const map = {};
  headerRow.forEach((h,i) => {
    const low = String(h).toLowerCase().trim();
    for(const field in HEADER_HINTS){
      if(map[field] !== undefined) continue;
      if(HEADER_HINTS[field].some(hint => low === hint || low.includes(hint))){
        map[field] = i; break;
      }
    }
  });
  return map;
}

function guessTaskStatus(raw){
  const s = String(raw || '').toLowerCase().trim();
  /* "not started" and "not done" must be caught before the words
     "started" and "done" are looked for inside them */
  if(/^(not|yet|no)\b/.test(s) || /^(to ?do|pending|new|open)$/.test(s)) return 'todo';
  if(/(complete|done|finish|closed|achiev)/.test(s)) return 'done';
  if(/(progress|ongoing|wip|started|doing|working)/.test(s)) return 'wip';
  return 'todo';
}
function guessGoalStatus(raw){
  const s = String(raw || '').toLowerCase().trim();
  if(/^(not|yet|no)\b/.test(s)) return 'plan';
  if(/(complete|done|achiev|closed)/.test(s)) return 'done';
  if(/(risk|attention|delay|behind|concern)/.test(s)) return 'risk';
  if(/(hold|pause|stop)/.test(s)) return 'hold';
  if(/(progress|ongoing|track|started)/.test(s)) return 'on';
  return 'plan';
}
function guessMonth(raw){
  const s = String(raw || '').toLowerCase();
  const hit = MONTHS.find(m => s.includes(m.toLowerCase().slice(0,3)));
  return hit || thisMonth();
}

/* turn parsed rows into records for the chosen destination */
function buildImport(rows, target, personId){
  if(rows.length < 2) return { records:[], map:{}, error:'Needs a heading row and at least one row of data.' };
  const map  = mapHeaders(rows[0]);
  const body = rows.slice(1);
  const get  = (r,f) => map[f] === undefined ? '' : (r[map[f]] || '');
  const records = [];

  body.forEach(r => {
    const title = get(r,'name') || r.find(c => c) || '';
    if(!String(title).trim()) return;

    if(target === 'myTasks'){
      let pri = parseInt(String(get(r,'priority')).replace(/[^0-9]/g,''),10);
      if(!(pri >= 1 && pri <= 3)) pri = 1;
      records.push({ id:uid('t'), month:guessMonth(get(r,'month') || get(r,'date')),
        name:title, status:guessTaskStatus(get(r,'status')), priority:pri });

    } else if(target === 'goals'){
      records.push({ id:uid('g'), name:title, objective:get(r,'note'),
        timeline:get(r,'date') || get(r,'month'), status:guessGoalStatus(get(r,'status')),
        comments:[], subtasks:[] });

    } else if(target === 'reminders'){
      records.push({ id:uid('r'), date:get(r,'date') || today(), title,
        note:get(r,'note'), who:get(r,'person'), done:guessTaskStatus(get(r,'status')) === 'done' });

    } else if(target === 'budget'){
      records.push({ id:uid('b'), date:get(r,'date') || today(), title,
        amount: parseFloat(String(get(r,'amount')).replace(/[^0-9.\-]/g,'')) || 0,
        by:get(r,'person'), head:get(r,'head') || 'Other' });
    }
  });

  return { records, map, target, personId };
}

function applyImport(built){
  const { records, target, personId } = built;
  if(!records.length) return 0;
  if(target === 'myTasks')        DB.myTasks.push(...records);
  else if(target === 'reminders') DB.reminders.push(...records);
  else if(target === 'budget'){
    DB.budget.entries.push(...records);
    records.forEach(r => { if(r.head && !DB.budget.heads.includes(r.head)) DB.budget.heads.push(r.head); });
  }
  else if(target === 'goals'){
    const p = person(personId);
    if(!p) return 0;
    p.goals.push(...records);
  }
  save();
  return records.length;
}

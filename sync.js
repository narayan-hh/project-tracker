/* ==========================================================
   SYNC  —  pull pages straight from your Google Sheets
   ----------------------------------------------------------
   Two connections, kept apart:

     budget  ->  the ESI tab of the budget spreadsheet
                 (budget-sync.gs)
     tasks   ->  the Tasks tab of the task spreadsheet
                 (tasks-sync.gs)

   Each script lives inside its own spreadsheet and runs as
   you, in your own Google account. Nothing here ever sees
   your Drive.

   Every web app URL and password is kept in this browser
   only (localStorage). None is written to a file, so none
   can end up on GitHub.

   How it fetches
   --------------
   This site runs from a file:// page, and browsers refuse
   ordinary fetch() calls from there. So we ask Google the
   old-fashioned way: we add a <script> tag pointing at the
   web app and let it call us back. That path has no CORS
   rules at all, which is why the earlier attempts failed and
   this one does not.
   ========================================================== */

const SYNC_KEY     = 'pt_sheet_sync_v2';
const SYNC_KEY_OLD = 'pt_sheet_sync_v1';   /* budget only, before tasks existed */

/* ---------- the two connections ---------- */

const SYNC_KINDS = {
  budget: {
    title:  'Google Sheet',
    noun:   'expense',
    nouns:  'expenses',
    master: 'The sheet is the master copy — every load replaces the expenses shown here.',
    hint:   'Paste the web app link from your budget spreadsheet\'s Apps Script, and the '
          + 'password from line 13 of that script. Both stay in this browser only.'
  },
  tasks: {
    title:  'Google Sheet',
    noun:   'task',
    nouns:  'tasks',
    master: 'The sheet is the master copy — every load replaces the tasks shown here.',
    hint:   'Paste the web app link from your task spreadsheet\'s Apps Script, and the '
          + 'password from line 13 of that script. Both stay in this browser only.'
  },
  kpis: {
    title:  'Google Sheet',
    noun:   'KPI',
    nouns:  'KPIs',
    master: 'The sheet is the master copy — every load replaces the KPIs below.',
    hint:   'Paste the web app link from your own portfolio spreadsheet\'s Apps Script, '
          + 'and the password from line 13 of that script. Both stay in this browser only.'
  }
};

/* ---------- where the settings live ---------- */

function syncAll(){
  let all;
  try{ all = JSON.parse(localStorage.getItem(SYNC_KEY)); }catch(e){}
  if(all && typeof all === 'object') return all;

  /* carry the budget connection over from before tasks existed */
  try{
    const old = JSON.parse(localStorage.getItem(SYNC_KEY_OLD));
    if(old && old.url) return { budget: old };
  }catch(e){}

  return {};
}

function syncCfg(kind){
  return syncAll()[kind] || {};
}

function syncCfgSave(kind, cfg){
  const all = syncAll();
  all[kind] = cfg;
  try{ localStorage.setItem(SYNC_KEY, JSON.stringify(all)); }catch(e){}
}

function syncCfgDrop(kind){
  const all = syncAll();
  delete all[kind];
  try{
    localStorage.setItem(SYNC_KEY, JSON.stringify(all));
    localStorage.removeItem(SYNC_KEY_OLD);
  }catch(e){}
}

function syncConnected(kind){
  const c = syncCfg(kind);
  return !!(c.url && c.token);
}

/* A tidy "3 minutes ago" for the status line. */
function syncWhen(iso){
  if(!iso) return 'never';
  const then = new Date(iso);
  if(isNaN(then)) return 'never';
  const mins = Math.round((Date.now() - then) / 60000);
  if(mins < 1)    return 'just now';
  if(mins < 60)   return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
  const hrs = Math.round(mins / 60);
  if(hrs < 24)    return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  return then.toLocaleDateString('en-IN', { day:'numeric', month:'short' })
       + ' at ' + then.toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit' });
}

/* ---------- the call itself ---------- */

/* Loads url with &callback=... and resolves with whatever the
   script hands back. Rejects on a bad URL or a slow answer. */
function jsonp(url, timeoutMs){
  return new Promise((resolve, reject) => {
    const cb = 'ptsync_' + Math.random().toString(36).slice(2, 10);
    const tag = document.createElement('script');
    let settled = false;

    const cleanUp = () => {
      try{ delete window[cb]; }catch(e){ window[cb] = undefined; }
      if(tag.parentNode) tag.parentNode.removeChild(tag);
    };
    const finish = (fn, arg) => {
      if(settled) return;
      settled = true;
      clearTimeout(timer);
      cleanUp();
      fn(arg);
    };

    const timer = setTimeout(
      () => finish(reject, new Error('Google did not answer within 25 seconds.')),
      timeoutMs || 25000);

    window[cb] = data => finish(resolve, data);

    tag.onerror = () => finish(reject,
      new Error('That web app URL could not be reached. Check the link, '
              + 'and that the deployment is set to "Anyone".'));

    /* Google replied, but not with the answer we asked for — so the
       callback never ran. Nearly always a sign-in page (you are in
       more than one Google account) or a deployment too old to know
       how to call us back. The browser hides the details from us,
       hence the guesswork. */
    tag.onload = () => setTimeout(() => finish(reject,
      new Error('Google replied, but not with your data. That is either a '
              + 'sign-in page — try the link in a window signed in to one '
              + 'Google account only — or an older deployment: in Apps Script, '
              + 'Deploy › Manage deployments › pencil › Version: New version.')), 300);

    tag.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + cb;
    document.head.appendChild(tag);
  });
}

/* Keep only the address itself. People paste the link with a
   ?token=... or a ?debug=... already on the end — and then our own
   ?token= lands on top of it and Google reads nonsense. That was
   the whole of the trouble the first time round. */
function cleanUrl(u){
  return String(u || '').trim().replace(/[?#].*$/, '');
}

function syncUrl(kind, extra){
  const c = syncCfg(kind);
  return cleanUrl(c.url) + '?token=' + encodeURIComponent(String(c.token).trim())
       + (extra || '');
}

/* ---------- turning sheet rows into records ---------- */

/* Whatever word sits in a Status cell, work out which of the
   three the site uses. Anything unrecognised counts as not
   started, which is the safe reading of a half-filled sheet. */
function taskStatusFrom(word){
  const s = String(word || '').trim().toLowerCase();
  if(!s) return 'todo';

  /* "not started" must be read before "started", or the not is lost.
     "need attention" is the exception — it is work under way. */
  if(/\bnot\b|^yet to|^to ?do|^pending|^new$/.test(s) && !/attention/.test(s)) return 'todo';
  if(/complete|done|closed|finish/.test(s))                                    return 'done';
  if(/progress|ongoing|wip|started|underway|doing/.test(s))                    return 'doing';

  /* the words this sheet actually uses for live work */
  if(/on track|attention|at risk|blocked|delay|slip|hold|review/.test(s))      return 'doing';

  return 'todo';
}

/* The sheet says more than the three words this site has. "On track"
   and "Need attention" both become In progress, so the sheet's own
   word is kept at the front of the note rather than thrown away. */
function taskFlagFrom(word){
  const s = String(word || '').trim();
  if(!s) return '';
  const l = s.toLowerCase();
  if(/^(done|completed?|closed|finished)$/.test(l))                        return '';
  if(/^(not started|not yet started|yet to start|to ?do|pending|new)$/.test(l)) return '';
  if(/^(in progress|ongoing|wip|doing|started|underway)$/.test(l))         return '';
  return s;
}

function budgetRows(res){
  return (res.entries || []).map(e => ({
    id:         e.id,
    program:    e.program    || '',
    date:       e.date       || '',
    title:      e.title      || '',
    amount:     Number(e.amount) || 0,
    vendor:     e.vendor     || '',
    by:         e.by         || '',
    head:       e.head       || 'Other',
    approvedBy: e.approvedBy || '',
    updated:    e.updated    || ''
  }));
}

function taskRows(res){
  const month = thisMonth();
  return (res.tasks || []).map(t => {
    const flag = taskFlagFrom(t.status);
    const note = t.note || '';
    return {
      id:       t.id,
      month:    month,
      name:     t.name || '',
      status:   taskStatusFrom(t.status),
      priority: Math.min(3, Math.max(1, Number(t.priority) || 1)),
      due:      '',
      note:     flag ? (note ? flag + ' · ' + note : flag) : note,
      doneAt:   ''
    };
  });
}

/* ---------- pull a sheet into its page ---------- */

async function sheetPull(kind){
  if(!syncConnected(kind)) throw new Error('No sheet connected yet.');

  const res = await jsonp(syncUrl(kind));

  if(!res || !res.ok){
    const why = (res && res.error) || 'the script said no';
    if(String(why).toLowerCase().indexOf('token') !== -1){
      const err = new Error('The sheet rejected the password.');
      err.tokenProblem = true;   /* the panel then runs the deeper check */
      throw err;
    }
    throw new Error('The sheet answered: ' + why);
  }

  let n;
  if(kind === 'kpis'){
    const me = theLead();
    if(!me) throw new Error('There is no one on the team to put these KPIs against.');
    /* kpiFrom fills in every period, so a sheet missing a quarter
       still produces a complete card */
    me.kpis = (res.kpis || []).map(kpiFrom);
    n = me.kpis.length;
  }else if(kind === 'tasks'){
    const rows = taskRows(res);
    DB.myTasks = rows;
    n = rows.length;
  }else{
    const rows = budgetRows(res);
    DB.budget.entries = rows;
    rows.forEach(r => {
      if(r.head && !DB.budget.heads.includes(r.head)) DB.budget.heads.push(r.head);
    });
    n = rows.length;
  }

  const c = syncCfg(kind);
  c.last    = new Date().toISOString();
  c.count   = n;
  c.version = res.version || '';
  syncCfgSave(kind, c);
  save();

  return n;
}

/* Runs once when the site opens, quietly, for whatever is connected. */
async function sheetAutoPull(){
  const kinds = Object.keys(SYNC_KINDS).filter(syncConnected);
  if(!kinds.length) return;

  let touched = false;
  for(const kind of kinds){
    try{
      const n = await sheetPull(kind);
      touched = true;
      toast(n + ' ' + (n === 1 ? SYNC_KINDS[kind].noun : SYNC_KINDS[kind].nouns)
            + ' loaded from your Google Sheet');
    }catch(err){
      /* Offline or asleep — keep whatever is already saved. */
      console.warn(kind + ' sync on start:', err.message);
    }
  }
  if(touched) render();
}

/* ---------- the panel, the same on both pages ---------- */

function syncPanel(kind){
  const k = SYNC_KINDS[kind];
  const c = syncCfg(kind);

  /* Nothing linked yet. Connecting a spreadsheet is a once-ever job,
     so the form folds down to one line and lets the page get on with
     showing the records. */
  if(!c.url || !c.token){
    return `
    <details class="sync-setup reveal sync-panel" data-kind="${kind}">
      <summary>
        <span class="sync-dot off" aria-hidden="true"></span>
        <b>${k.title}</b>
        <span class="sync-state">Not connected &middot; open to set it up</span>
      </summary>
      <div class="sync-body">
        <p class="sub" style="margin:0 0 12px">${k.hint}</p>
        <div class="sync-form">
          <label>Web app URL
            <input id="sync-url-${kind}" type="text" spellcheck="false"
                   placeholder="https://script.google.com/macros/s/.../exec">
          </label>
          <label>Password
            <input id="sync-token-${kind}" type="text" spellcheck="false"
                   placeholder="the SECRET from the script">
          </label>
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn go" data-act="sheet-save" data-kind="${kind}">Connect and load</button>
          <button class="btn" data-act="sheet-check" data-kind="${kind}">Test the link</button>
        </div>
        <div id="sync-out-${kind}" class="sync-out"></div>
      </div>
    </details>`;
  }

  return `
  <div class="panel reveal sync-panel" style="margin-bottom:16px" data-kind="${kind}">
    <div class="section-head" style="margin:0 0 10px">
      <h2>${k.title}</h2>
      <span class="spacer"></span>
      <span class="sync-dot on"></span><span class="sync-state">Connected</span>
    </div>
    <p class="sub" style="margin:0 0 12px">
      Last loaded ${esc(syncWhen(c.last))}${c.count != null
        ? ' &middot; ' + c.count + ' ' + (c.count === 1 ? k.noun : k.nouns) : ''}.
      ${k.master}
    </p>
    <p class="sub sync-which" style="margin:-6px 0 12px">
      Using <code>&hellip;${esc(String(c.url).slice(-18))}</code>
      with a ${String(c.token).length}-character password.
    </p>
    <div class="row">
      <button class="btn go" data-act="sheet-sync" data-kind="${kind}">Load from sheet now</button>
      <button class="btn" data-act="sheet-check" data-kind="${kind}">Test the link</button>
      <span class="spacer"></span>
      <button class="btn danger" data-act="sheet-forget" data-kind="${kind}">Disconnect</button>
    </div>
    <div id="sync-out-${kind}" class="sync-out"></div>
  </div>`;
}

/* what the two pages call */
function budgetSyncPanel(){ return syncPanel('budget'); }
function tasksSyncPanel(){  return syncPanel('tasks');  }

/* only on your own page — the team's KPIs come from their
   portfolio workbooks, not from a sheet of yours */
function kpisSyncPanel(p){
  const me = theLead();
  return (me && p && p.id === me.id) ? syncPanel('kpis') : '';
}

/* When the password is refused, this asks the script to describe
   itself and lays the two sides next to each other. A stray space
   or an old deployment shows up immediately as a different length
   or a different version. */
async function syncDiagnose(kind){
  const c   = syncCfg(kind);
  const tok = String(c.token || '');
  const url = cleanUrl(c.url);
  const out = [
    'Saved link ends: <code>&hellip;' + esc(url.slice(-16)) + '</code>',
    'This page is sending: <b>' + tok.length + ' characters</b>, starting "<code>'
      + esc(tok.slice(0, 3)) + '</code>"'
  ];

  try{
    const r = await jsonp(url + '?debug=1&token=' + encodeURIComponent(tok));
    out.push('The script is expecting: <b>' + (r.secretLength || 0) + ' characters</b>, '
           + 'starting "<code>' + esc(String(r.secretStarts || '')) + '</code>"');
    out.push('Script version answering: <b>' + esc(String(r.liveVersion || '?')) + '</b>');
    out.push('They match: <b>' + (r.theyMatch ? 'yes' : 'no') + '</b>');

    if(!r.theyMatch){
      out.push('<br>The two passwords differ. Retype the password here by hand rather '
             + 'than pasting, in case a space came along with it. If you changed SECRET '
             + 'in the script, redeploy: Deploy &rsaquo; Manage deployments &rsaquo; the '
             + 'pencil &rsaquo; Version: <b>New version</b>.');
    }
  }catch(e){
    out.push('Could not run the deeper check: ' + esc(e.message));
  }

  return out.join('<br>');
}

function syncSay(kind, html, tone){
  const box = document.getElementById('sync-out-' + kind);
  if(!box) return;
  box.className = 'sync-out show ' + (tone || '');
  box.innerHTML = html;
}

/* ---------- the buttons ---------- */

function syncField(id){
  const el = document.getElementById(id);
  return el ? el.value : '';
}

async function syncLoad(kind){
  try{
    const n = await sheetPull(kind);
    render();
    toast(n + ' ' + (n === 1 ? SYNC_KINDS[kind].noun : SYNC_KINDS[kind].nouns)
          + ' loaded from your Google Sheet');
  }catch(err){
    let msg = esc(err.message);
    if(err.tokenProblem) msg += '<br><br>' + await syncDiagnose(kind);
    syncSay(kind, msg, 'warn');
  }
}

async function syncAction(a, act){
  const kind = (act && act.dataset && act.dataset.kind) || 'budget';
  if(!SYNC_KINDS[kind]) return false;

  if(a === 'sheet-save'){
    const raw   = syncField('sync-url-' + kind);
    const token = syncField('sync-token-' + kind).trim();
    const url   = cleanUrl(raw);

    if(!url || !token){
      syncSay(kind, 'Both boxes need filling in.', 'warn');
      return true;
    }
    if(/\/dev$/.test(url)){
      syncSay(kind, 'That is the <code>/dev</code> link. It only works while you are signed '
                  + 'in to Apps Script. Deploy the script and use the link ending '
                  + 'in <code>/exec</code>.', 'warn');
      return true;
    }
    if(!/\/exec$/.test(url)){
      syncSay(kind, 'That link should end in <code>/exec</code>.', 'warn');
      return true;
    }

    /* connecting replaces what is on the page, so say so first */
    const existing = kind === 'tasks' ? DB.myTasks.length
                   : kind === 'kpis'  ? ((theLead() || {}).kpis || []).length
                   : DB.budget.entries.length;
    if(existing && !confirm(
        'Loading from the sheet will replace the ' + existing + ' '
      + (existing === 1 ? SYNC_KINDS[kind].noun : SYNC_KINDS[kind].nouns)
      + ' already on this page.\n\nSettings has "Export backup" if you want a copy first.'
      + '\n\nGo ahead?')){
      return true;
    }

    syncCfgSave(kind, { url:url, token:token });

    /* say so, so nobody wonders where the rest of their link went */
    if(raw.trim() !== url){
      toast('The ?… on the end of your link was trimmed off — the page adds its own');
    }

    syncSay(kind, 'Connecting…');
    await syncLoad(kind);
    return true;
  }

  if(a === 'sheet-sync'){
    syncSay(kind, 'Loading…');
    await syncLoad(kind);
    return true;
  }

  /* Asks the script to describe itself. Answers even when the
     password is wrong, so it tells us which half is broken. */
  if(a === 'sheet-check'){
    const c     = syncCfg(kind);
    const url   = cleanUrl(syncField('sync-url-' + kind) || c.url || '');
    const token = String(syncField('sync-token-' + kind) || c.token || '').trim();
    if(!url){ syncSay(kind, 'Put the web app URL in first.', 'warn'); return true; }

    syncSay(kind, 'Testing…');
    try{
      const r = await jsonp(url + '?debug=1&token=' + encodeURIComponent(token));
      if(!r){ syncSay(kind, 'Google answered with nothing at all.', 'warn'); return true; }

      const lines = [
        'Script version live: <b>' + esc(String(r.liveVersion || '?')) + '</b>',
        'Password reached the script: <b>' + (r.tokenArrived ? 'yes' : 'no') + '</b>',
        'Passwords match: <b>' + (r.theyMatch ? 'yes' : 'no') + '</b>',
        'Heading row found: <b>' + esc(String(r.headerRow)) + '</b>'
      ];
      if(r.groups) lines.push('Priority groups: <b>' + esc(r.groups.join(', ')) + '</b>');

      /* connected the task sheet to the budget page, or the other way round */
      const wrong = (kind === 'tasks' && r.kind && r.kind !== 'tasks')
                 || (kind === 'budget' && r.kind === 'tasks');
      if(wrong){
        lines.push('<br>That link belongs to the other sheet. Each page needs its own.');
      }
      syncSay(kind, lines.join('<br>'), (r.theyMatch && !wrong) ? 'ok' : 'warn');
    }catch(err){
      syncSay(kind, esc(err.message), 'warn');
    }
    return true;
  }

  if(a === 'sheet-forget'){
    syncCfgDrop(kind);
    render();
    toast('Disconnected from the Google Sheet');
    return true;
  }

  return false;
}

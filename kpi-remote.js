/* ==========================================================
   My Workstation — team KPIs from the portfolio sheets
   ----------------------------------------------------------
   A GitHub workflow in the private email-drive-brain repo
   reads every team member's portfolio workbook from Drive,
   locks the KPIs with a password (AES-256-GCM, the key
   stretched with PBKDF2) and publishes only the locked file
   here, as kpis.enc.json.

   This site is public, so the figures are never readable
   from it without the password. The password is typed in
   once per browser and kept in this browser only
   (localStorage); it is never written to a file.

   Unlocking happens entirely in the browser (Web Crypto).
   ========================================================== */

const KPI_REMOTE_FILE = 'kpis.enc.json';
/* a page opened from the laptop's own folder has no web address of
   its own, so it asks the published site for the file instead */
const KPI_REMOTE_SITE = 'https://narayan-hh.github.io/project-tracker/';
const KPI_KEY_STORE   = 'pt_kpi_key_v1';

/* 'idle' | 'none' (nothing published) | 'locked' | 'badkey' | 'ok' | 'error' */
let KPI_REMOTE_STATE = 'idle';

function kpiKey(){
  try{ return localStorage.getItem(KPI_KEY_STORE) || ''; }catch(e){ return ''; }
}
function kpiKeySave(k){
  try{
    if(k) localStorage.setItem(KPI_KEY_STORE, k);
    else  localStorage.removeItem(KPI_KEY_STORE);
  }catch(e){}
}

function b64bytes(s){
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function kpiFetchLocked(){
  const base = location.protocol === 'file:' ? KPI_REMOTE_SITE : '';
  const res = await fetch(base + KPI_REMOTE_FILE + '?t=' + Date.now(), { cache:'no-store' });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error('The KPI file could not be fetched (' + res.status + ').');
  return res.json();
}

/* the same recipe publish_kpis.py uses to lock it */
async function kpiOpen(box, password){
  const enc  = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(password),
                                             'PBKDF2', false, ['deriveKey']);
  const key  = await crypto.subtle.deriveKey(
    { name:'PBKDF2', hash:'SHA-256', salt:b64bytes(box.salt), iterations:box.iter },
    base, { name:'AES-GCM', length:256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name:'AES-GCM', iv:b64bytes(box.iv) }, key, b64bytes(box.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

/* Fetch, unlock and load. Quiet on start-up; says what happened when
   the unlock button was pressed. */
async function kpiRemoteLoad(loud){
  let box;
  try{
    box = await kpiFetchLocked();
  }catch(err){
    KPI_REMOTE_STATE = 'error';
    console.warn('KPI file:', err.message);
    if(loud) toast('Could not reach the KPI file just now. Check the connection.');
    return;
  }
  if(!box){ KPI_REMOTE_STATE = 'none'; return; }

  const password = kpiKey();
  if(!password){ KPI_REMOTE_STATE = 'locked'; render(); return; }

  /* same figures as last time: nothing to do */
  if(DB.meta.kpiSource === 'remote' && DB.meta.kpiStamp === box.stamp){
    KPI_REMOTE_STATE = 'ok';
    if(loud) toast('Team KPIs are already up to date');
    return;
  }

  let seed;
  try{
    seed = await kpiOpen(box, password);
  }catch(err){
    KPI_REMOTE_STATE = 'badkey';
    render();
    return;
  }

  KPI_REMOTE_STATE = 'ok';
  seed.stamp   = box.stamp;
  seed.updated = box.updated || seed.updated || '';
  const done = seedKpisFromFile(seed);
  save();
  render();
  if(done && done.loaded){
    toast(done.loaded + ' KPIs for ' + done.members + ' members '
        + (done.first ? 'loaded' : 'updated') + ' from the portfolio sheets');
  }
}

/* shown at the top of the Team page until this browser can unlock */
function kpiLockPanel(){
  if(KPI_REMOTE_STATE !== 'locked' && KPI_REMOTE_STATE !== 'badkey') return '';
  const bad = KPI_REMOTE_STATE === 'badkey';
  return `
    <div class="panel reveal kpi-lock">
      <div class="section-head" style="margin:0 0 6px">
        <h2>Unlock team KPIs</h2>
      </div>
      <p class="sub" style="margin:0 0 12px">
        The KPIs are read from each member's portfolio sheet every morning and kept
        locked, because this site is public. Enter the KPI password once and this
        browser will remember it.
      </p>
      <form class="row kpi-lock-form" data-kpi-unlock>
        <input id="kpi-pass" type="password" autocomplete="current-password"
               placeholder="KPI password" aria-label="KPI password">
        <button class="btn go" type="submit">Unlock</button>
      </form>
      ${bad ? `<p class="sync-out show warn" style="margin-top:10px">
                 That password did not open the KPI file. Check it and try again.</p>` : ''}
    </div>`;
}

/* a form submit, so Enter works as well as the button */
document.addEventListener('submit', e => {
  const form = e.target.closest && e.target.closest('[data-kpi-unlock]');
  if(!form) return;
  e.preventDefault();
  const el = document.getElementById('kpi-pass');
  const pass = el ? el.value.trim() : '';
  if(!pass) return;
  kpiKeySave(pass);
  kpiRemoteLoad(true);
});

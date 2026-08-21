/* ==========================================================
   Project Tracker — small shared UI pieces
   Toasts, undo, a modal, and a confirm box that matches
   the rest of the site instead of the browser's grey alert.
   ========================================================== */

/* ==========================================================
   Toasts  —  a short message in the corner
   ========================================================== */
function toastHost(){
  let h = document.getElementById('toasts');
  if(!h){
    h = document.createElement('div');
    h.id = 'toasts';
    h.className = 'toasts';
    document.body.appendChild(h);
  }
  return h;
}

/* toast('Saved')                          → plain
   toast('Deleted', { undo: fn })          → shows an Undo button
   toast('Careful', { kind:'warn' })       → amber
*/
function toast(msg, opts){
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'toast ' + (opts.kind || 'ok');
  el.innerHTML = `<span class="tx">${esc(msg)}</span>`;

  if(opts.undo){
    const b = document.createElement('button');
    b.className = 'toast-undo';
    b.textContent = 'Undo';
    b.onclick = () => { opts.undo(); el.remove(); toast('Put back'); };
    el.appendChild(b);
  }

  const x = document.createElement('button');
  x.className = 'toast-x';
  x.innerHTML = '&times;';
  x.onclick = () => close();
  el.appendChild(x);

  toastHost().appendChild(el);

  const life = opts.undo ? 7000 : 2600;
  const timer = setTimeout(close, life);
  function close(){
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }
  return close;
}

/* ==========================================================
   Delete with an undo, instead of "are you sure?"
   Far quicker in daily use: the row goes, and you get 7
   seconds to change your mind.
   ========================================================== */
function removeWithUndo(label, restore){
  save();
  render();
  toast(label + ' removed', { undo: () => { restore(); save(); render(); } });
}

/* ==========================================================
   Modal shell
   ========================================================== */
let modalCloser = null;

function openModal(title, bodyHtml, opts){
  opts = opts || {};
  closeModal();

  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.id = 'modal-wrap';
  wrap.innerHTML = `
    <div class="modal-back"></div>
    <div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <header class="modal-head">
        <h2>${esc(title)}</h2>
        <button class="modal-x" aria-label="Close">&times;</button>
      </header>
      <div class="modal-body">${bodyHtml}</div>
      ${opts.foot ? `<footer class="modal-foot">${opts.foot}</footer>` : ''}
    </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));

  wrap.querySelector('.modal-x').onclick = closeModal;
  wrap.querySelector('.modal-back').onclick = closeModal;
  modalCloser = opts.onClose || null;

  /* keep the keyboard inside the dialog */
  const first = wrap.querySelector('input,select,textarea,button');
  if(first) setTimeout(() => first.focus(), 90);

  return wrap;
}

function closeModal(){
  const w = document.getElementById('modal-wrap');
  if(!w) return;
  w.classList.remove('in');
  setTimeout(() => w.remove(), 200);
  if(modalCloser){ const f = modalCloser; modalCloser = null; f(); }
}

/* our own confirm, so the wording can be plain and the look consistent */
function askConfirm(question, detail, onYes, yesLabel){
  const wrap = openModal(question, `<p class="muted" style="margin:0">${esc(detail || '')}</p>`, {
    foot: `<button class="btn" data-no>Cancel</button>
           <button class="btn danger" data-yes>${esc(yesLabel || 'Delete')}</button>`
  });
  wrap.querySelector('[data-no]').onclick = closeModal;
  wrap.querySelector('[data-yes]').onclick = () => { closeModal(); onYes(); };
}

/* Escape closes the top-most thing */
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && document.getElementById('modal-wrap')){
    e.stopPropagation();
    closeModal();
  }
}, true);

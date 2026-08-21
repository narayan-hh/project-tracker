/* ==========================================================
   Project Tracker — the newer button actions
   ----------------------------------------------------------
   app.js calls extraAction() first. Anything handled here
   returns true and stops there. Everything else falls
   through to the original list in app.js.

   Two things are done differently now:
     • deleting gives you an Undo instead of asking first
     • spreadsheets can be imported from any page
   ========================================================== */

function extraAction(a, act){

  /* ---------- spreadsheets ---------- */
  if(a === 'import-here'){ importForThisPage(); return true; }
  if(a === 'open-import'){
    openImport(act.dataset.target, act.dataset.p || ctx().pid, ctx().gid);
    return true;
  }
  if(a === 'export-here'){ exportForThisPage(); return true; }
  if(a === 'export-csv'){ exportSection(act.dataset.target); return true; }

  /* ---------- weekly review ---------- */
  if(a === 'copy-review'){ copyReview(); return true; }
  if(a === 'print-review'){ setTimeout(() => window.print(), 60); return true; }
  if(a === 'shortcuts'){ showShortcuts(); return true; }

  /* ---------- filters on the tasks page ---------- */
  if(a === 'tf-status'){ TASKFILTER.status = act.dataset.v; render(); return true; }
  if(a === 'tf-overdue'){ TASKFILTER.overdue = !TASKFILTER.overdue; render(); return true; }
  if(a === 'tf-clear'){
    TASKFILTER.q = ''; TASKFILTER.month = 'all';
    TASKFILTER.status = 'all'; TASKFILTER.overdue = false;
    render(); return true;
  }

  /* ==========================================================
     Deleting, with an undo
     ========================================================== */

  if(a === 'del-task'){
    const id = act.closest('[data-task]').dataset.task;
    const ix = DB.myTasks.findIndex(t => t.id === id);
    if(ix < 0) return true;
    const gone = DB.myTasks[ix];
    DB.myTasks.splice(ix, 1);
    removeWithUndo('Task', () => DB.myTasks.splice(ix, 0, gone));
    return true;
  }

  if(a === 'del-reminder'){
    const id = act.closest('[data-rem]').dataset.rem;
    const ix = DB.reminders.findIndex(r => r.id === id);
    if(ix < 0) return true;
    const gone = DB.reminders[ix];
    DB.reminders.splice(ix, 1);
    removeWithUndo('Reminder', () => DB.reminders.splice(ix, 0, gone));
    return true;
  }

  if(a === 'del-entry'){
    const id = act.closest('[data-entry]').dataset.entry;
    const ix = DB.budget.entries.findIndex(x => x.id === id);
    if(ix < 0) return true;
    const gone = DB.budget.entries[ix];
    DB.budget.entries.splice(ix, 1);
    removeWithUndo('Expense', () => DB.budget.entries.splice(ix, 0, gone));
    return true;
  }

  if(a === 'del-head'){
    const i = +act.dataset.i;
    const gone = DB.budget.heads[i];
    DB.budget.heads.splice(i, 1);
    removeWithUndo('Budget head', () => DB.budget.heads.splice(i, 0, gone));
    return true;
  }

  if(a === 'del-wins' || a === 'del-concerns'){
    const kind = a === 'del-wins' ? 'wins' : 'concerns';
    const id = act.closest('[data-item]').dataset.item;
    const p = person(ctx().pid);
    if(!p) return true;
    const ix = p[kind].findIndex(x => x.id === id);
    if(ix < 0) return true;
    const gone = p[kind][ix];
    p[kind].splice(ix, 1);
    removeWithUndo(kind === 'wins' ? 'Achievement' : 'Note', () => p[kind].splice(ix, 0, gone));
    return true;
  }

  if(a === 'del-sub'){
    const { pid, gid } = ctx();
    const g = goalOf(person(pid), gid);
    if(!g) return true;
    const id = act.closest('[data-sub]').dataset.sub;
    const ix = g.subtasks.findIndex(s => s.id === id);
    if(ix < 0) return true;
    const gone = g.subtasks[ix];
    g.subtasks.splice(ix, 1);
    removeWithUndo('Subtask', () => g.subtasks.splice(ix, 0, gone));
    return true;
  }

  if(a === 'del-comment'){
    const { pid, gid } = ctx();
    const g = goalOf(person(pid), gid);
    if(!g) return true;
    const id = act.closest('[data-comment]').dataset.comment;
    const ix = g.comments.findIndex(c => c.id === id);
    if(ix < 0) return true;
    const gone = g.comments[ix];
    g.comments.splice(ix, 1);
    removeWithUndo('Comment', () => g.comments.splice(ix, 0, gone));
    return true;
  }

  if(a === 'del-checkin'){
    const p = person(ctx().pid);
    if(!p) return true;
    const id = act.dataset.c;
    const ix = p.checkins.findIndex(x => x.id === id);
    if(ix < 0) return true;
    const gone = p.checkins[ix];
    p.checkins.splice(ix, 1);
    if(!p.checkins.some(x => !x.done)) p.checkins.push(blankCheckin());
    removeWithUndo('Check-in', () => {
      p.checkins = p.checkins.filter(x => x.done || x.id === gone.id);
      p.checkins.splice(ix, 0, gone);
      if(!p.checkins.some(x => !x.done)) p.checkins.push(blankCheckin());
    });
    return true;
  }

  /* a goal holds a lot of work, so this one still asks — but in
     our own window rather than the browser's grey box */
  if(a === 'del-goal'){
    const { pid, gid } = ctx();
    const p = person(pid);
    const g = goalOf(p, gid);
    if(!g) return true;
    askConfirm('Delete this goal?',
      `“${g.name}” has ${g.subtasks.length} subtasks and ${g.comments.length} comments. They go too.`,
      () => {
        const ix = p.goals.findIndex(x => x.id === gid);
        const gone = p.goals[ix];
        p.goals.splice(ix, 1);
        save();
        location.hash = '#/p/' + pid;
        toast('Goal deleted', { undo: () => { p.goals.splice(ix, 0, gone); save(); render(); } });
      });
    return true;
  }

  if(a === 'del-person'){
    const id = act.dataset.p;
    const p = person(id);
    if(!p) return true;
    askConfirm(`Remove ${p.name}?`,
      `Their ${p.goals.length} goals and ${p.checkins.filter(c => c.done).length} filed check-ins go too.`,
      () => {
        const ix = DB.people.findIndex(x => x.id === id);
        const gone = DB.people[ix];
        DB.people.splice(ix, 1);
        save();
        location.hash = '#/team';
        toast(gone.name + ' removed', {
          undo: () => { DB.people.splice(ix, 0, gone); save(); render(); }
        });
      }, 'Remove');
    return true;
  }

  if(a === 'reset'){
    askConfirm('Reset everything?',
      'Every task, goal, check-in, reminder and expense goes back to the starting content. Export a backup first if you are not sure.',
      () => {
        const before = JSON.stringify(DB);
        DB = seed(); save();
        location.hash = '#/';
        render();
        toast('Everything reset', {
          undo: () => { DB = JSON.parse(before); normalise(); save(); render(); }
        });
      }, 'Reset');
    return true;
  }

  return false;      /* not ours — app.js carries on */
}

/* which section's CSV do we want, based on the page on screen? */
function exportForThisPage(){
  const h = (location.hash || '#/').slice(2).split('/').filter(Boolean);
  if(h[0] === 'reminders') return exportSection('reminders');
  if(h[0] === 'budget')    return exportSection('budget');
  if(h[0] === 'team')      return exportSection('people');
  if(h[0] === 'p')         return exportSection('goals');
  return exportSection('myTasks');
}

/* ==========================================================
   Dragging a task card between the priority columns
   ========================================================== */
function bindDragDrop(root){
  let dragId = null;

  root.querySelectorAll('.task-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.task;
      card.classList.add('dragging');
      try{ e.dataTransfer.setData('text/plain', dragId); }catch(err){}
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragId = null;
      root.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'));
    });
  });

  root.querySelectorAll('[data-col]').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drop-target');
    });
    col.addEventListener('dragleave', e => {
      if(!col.contains(e.relatedTarget)) col.classList.remove('drop-target');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drop-target');
      const id = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || dragId;
      const t = DB.myTasks.find(x => x.id === id);
      const pri = Number(col.dataset.col);
      if(t && pri && t.priority !== pri){
        t.priority = pri;
        save(); flashId = t.id; render();
        toast('Moved to Priority ' + pri);
      }
    });
  });
}

/* ==========================================================
   The search box on the tasks page
   Re-drawing loses the cursor, so it is put back afterwards.
   ========================================================== */
let tfTimer = null;
document.addEventListener('input', e => {
  if(e.target.id !== 'tf-q') return;
  TASKFILTER.q = e.target.value;
  clearTimeout(tfTimer);
  tfTimer = setTimeout(() => {
    render();
    const box = document.getElementById('tf-q');
    if(box){
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
  }, 200);
});

/* the month dropdown in the filter bar */
document.addEventListener('change', e => {
  if(e.target.id === 'tf-month'){ TASKFILTER.month = e.target.value; render(); }
});

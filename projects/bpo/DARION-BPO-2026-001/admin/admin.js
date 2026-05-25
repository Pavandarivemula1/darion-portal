/* ── Config ───────────────────────────────────────────── */
const CORRECT_PW  = 'BPO@Admin26';
const SESSION_KEY = 'bpo_admin_session';
const PROJECT_ID  = 'DARION-BPO-2026-001';
const SB_URL      = 'https://tigxrqqykijkofgntway.supabase.co';
// SB_KEY is loaded at runtime from /api/config — never hardcoded here
let SB_KEY = '';
let SB_HDR = { 'Content-Type': 'application/json' };

async function loadConfig() {
  try {
    const cfg = await fetch('/api/config').then(r => r.ok ? r.json() : null);
    if (cfg && cfg.supabaseKey) {
      SB_KEY = cfg.supabaseKey;
      SB_HDR = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
    }
  } catch(e) { console.warn('Config load failed:', e.message); }
}

/* ── Helpers ──────────────────────────────────────────── */
const $   = id => document.getElementById(id);
const esc = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const sel = (opts, val, cls) =>
  `<select class="${cls}">${opts.map(o=>`<option value="${esc(o)}"${o===val?' selected':''}>${esc(o)}</option>`).join('')}</select>`;

const STATUS   = ["Not Started","Planned","In Progress","At Risk","Blocked","Completed"];
const HEALTH   = ["Healthy","On Track","Watch","At Risk","Blocked"];
const PRIORITY = ["P0","P1","P2"];

/* ── State ────────────────────────────────────────────── */
let phases    = [];
let payments  = [];
let activeId  = null;
let activeTab = 'details';
let saving    = false;

/* ── Supabase API ─────────────────────────────────────── */
async function sbFetch(path, opts = {}) {
  const { headers: customHeaders = {}, ...restOpts } = opts;
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { ...SB_HDR, ...customHeaders },
    ...restOpts
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  if (res.status === 204 || opts.method === 'DELETE') return null;
  return res.json();
}

/* ── Load all data from Supabase ──────────────────────── */
async function loadFromDB() {
  showStatus('Loading from database…', 'info');
  try {
    const [rawPhases, rawPayments] = await Promise.all([
      sbFetch(`phases?project_id=eq.${PROJECT_ID}&select=*,tasks(*),phase_risks(*),phase_evidence(*)&order=sort_order`),
      sbFetch(`payment_gates?project_id=eq.${PROJECT_ID}&order=sort_order`)
    ]);

    phases = rawPhases.map(p => ({
      id:           p.id,
      code:         p.code,
      month:        p.month,
      title:        p.title,
      status:       p.status,
      health:       p.health,
      progress:     p.progress,
      amount:       p.amount,
      owner:        p.owner,
      clientAction: p.client_action,
      decision:     p.decision,
      updateNote:   p.update_note,
      sort_order:   p.sort_order,
      risks:        (p.phase_risks   || []).sort((a,b)=>a.sort_order-b.sort_order).map(r=>({ id: r.id, text: r.description })),
      evidence:     (p.phase_evidence|| []).sort((a,b)=>a.sort_order-b.sort_order).map(e=>({ id: e.id, text: e.description })),
      tasks:        (p.tasks         || []).sort((a,b)=>a.sort_order-b.sort_order).map(t=>({
        id: t.id, name: t.name, status: t.status, priority: t.priority, owner: t.owner, sort_order: t.sort_order
      }))
    }));

    payments = rawPayments.map(p => ({
      id:       p.id,
      trigger:  p.trigger_name,
      percent:  p.percent,
      amount:   p.amount,
      outcome:  p.outcome,
      sort_order: p.sort_order
    }));

    if (!activeId && phases.length) {
      const inProgress = phases.find(p => p.status === 'In Progress');
      activeId = (inProgress || phases[0]).id;
    }

    showStatus('Loaded live data from Supabase ✓', 'ok');
    render();
  } catch(e) {
    showStatus('DB load failed: ' + e.message, 'error');
    console.error(e);
  }
}

/* ── Save phase details to Supabase ───────────────────── */
async function savePhaseDetails(p) {
  if (saving) return;
  saving = true;
  showStatus('Saving…', 'info');
  try {
    await sbFetch(`phases?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        code:          p.code,
        month:         p.month,
        title:         p.title,
        status:        p.status,
        health:        p.health,
        progress:      p.progress,
        amount:        p.amount,
        owner:         p.owner,
        client_action: p.clientAction,
        decision:      p.decision,
        update_note:   p.updateNote,
      })
    });
    showStatus('Phase details saved to Supabase ✓', 'ok');
  } catch(e) {
    showStatus('Save failed: ' + e.message, 'error');
  }
  saving = false;
}

/* ── Save tasks — delete all + re-insert ──────────────── */
async function saveTasksToDB(phase, tasks) {
  if (saving) return;
  saving = true;
  showStatus('Saving tasks…', 'info');
  try {
    // Delete existing tasks for this phase
    await sbFetch(`tasks?phase_id=eq.${phase.id}`, { method: 'DELETE' });
    // Insert new tasks
    if (tasks.length) {
      const rows = tasks.map((t, i) => ({
        phase_id: phase.id,
        name: t.name,
        status: t.status,
        priority: t.priority,
        owner: t.owner,
        sort_order: i + 1
      }));
      await sbFetch('tasks', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(rows)
      });
    }
    showStatus('Tasks saved to Supabase ✓', 'ok');
    await loadFromDB();
  } catch(e) {
    showStatus('Task save failed: ' + e.message, 'error');
  }
  saving = false;
}

/* ── Save risks + evidence — delete + re-insert ───────── */
async function saveListsToDB(phase, risks, evidence) {
  if (saving) return;
  saving = true;
  showStatus('Saving risks & evidence…', 'info');
  try {
    await Promise.all([
      sbFetch(`phase_risks?phase_id=eq.${phase.id}`, { method: 'DELETE' }),
      sbFetch(`phase_evidence?phase_id=eq.${phase.id}`, { method: 'DELETE' })
    ]);
    const inserts = [];
    if (risks.length)    inserts.push(sbFetch('phase_risks',    { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(risks.map((r,i)=>({ phase_id: phase.id, description: r, sort_order: i + 1 }))) }));
    if (evidence.length) inserts.push(sbFetch('phase_evidence', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(evidence.map((e,i)=>({ phase_id: phase.id, description: e, sort_order: i + 1 }))) }));
    await Promise.all(inserts);
    showStatus('Risks & evidence saved to Supabase ✓', 'ok');
    await loadFromDB();
  } catch(e) {
    showStatus('List save failed: ' + e.message, 'error');
  }
  saving = false;
}

/* ── Save payment gates ───────────────────────────────── */
async function savePaymentsToDB(gates) {
  if (saving) return;
  saving = true;
  showStatus('Saving payment schedule…', 'info');
  try {
    await sbFetch(`payment_gates?project_id=eq.${PROJECT_ID}`, { method: 'DELETE' });
    if (gates.length) {
      await sbFetch('payment_gates', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(gates.map((g, i) => ({
          project_id:   PROJECT_ID,
          trigger_name: g.trigger,
          percent:      g.percent,
          amount:       g.amount,
          outcome:      g.outcome,
          sort_order:   i + 1
        })))
      });
    }
    showStatus('Payment schedule saved to Supabase ✓', 'ok');
    await loadFromDB();
  } catch(e) {
    showStatus('Payment save failed: ' + e.message, 'error');
  }
  saving = false;
}

/* ── Delete a phase ───────────────────────────────────── */
async function deletePhase(phase) {
  if (!confirm(`Delete phase "${phase.code} — ${phase.title}"?\nAll tasks, risks and evidence will be deleted. This cannot be undone.`)) return;
  saving = true;
  showStatus('Deleting…', 'info');
  try {
    await sbFetch(`phases?id=eq.${phase.id}`, { method: 'DELETE' });
    showStatus('Phase deleted ✓', 'ok');
    activeId = null;
    await loadFromDB();
  } catch(e) {
    showStatus('Delete failed: ' + e.message, 'error');
  }
  saving = false;
}

/* ── Status bar ───────────────────────────────────────── */
function showStatus(msg, type) {
  const el = $('status-bar');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-bar ' + (type || '');
}

/* ── Toast ────────────────────────────────────────────── */
function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg || 'Saved to Supabase ✓';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── Auth ─────────────────────────────────────────────── */
function unlock() {
  if ($('pw-input').value === CORRECT_PW) {
    sessionStorage.setItem(SESSION_KEY, 'granted');
    $('lock-screen').style.display = 'none';
    $('admin-shell').style.display = 'block';
    loadFromDB();
  } else {
    $('lock-error').textContent = 'Incorrect key. Try again.';
    $('pw-input').value = '';
    $('pw-input').focus();
    setTimeout(() => $('lock-error').textContent = '', 3000);
  }
}
$('pw-submit').addEventListener('click', unlock);
$('pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });

/* ── Sidebar ──────────────────────────────────────────── */
function renderSidebar() {
  $('phase-nav').innerHTML = phases.map(p => `
    <button class="phase-nav-btn${p.id === activeId ? ' active' : ''}" data-id="${p.id}">
      <p class="pnb-meta">${esc(p.code)} · ${esc(p.month)}</p>
      <p class="pnb-title">${esc(p.title)}</p>
      <p class="pnb-status" style="color:${statusColor(p.status)}">${esc(p.status)} · ${p.progress}%</p>
    </button>`).join('');
  $('phase-nav').querySelectorAll('.phase-nav-btn').forEach(b =>
    b.addEventListener('click', () => { activeId = parseInt(b.dataset.id); activeTab = 'details'; render(); }));
}
function statusColor(s) {
  return s==='Completed'?'#0e6027':s==='In Progress'?'#0043ce':s==='At Risk'?'#684e00':s==='Blocked'?'#a2191f':'#525252';
}

/* ── Tab switcher ─────────────────────────────────────── */
function renderTabs() {
  const tabs = [
    { id: 'details',  label: 'Phase details' },
    { id: 'tasks',    label: 'Tasks' },
    { id: 'lists',    label: 'Risks & Evidence' },
    { id: 'payments', label: 'Payment schedule' },
  ];
  return `<div class="section-tabs">
    ${tabs.map(t => `<button class="tab-btn${activeTab===t.id?' active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
  </div>`;
}

/* ── Details tab ──────────────────────────────────────── */
function renderDetails(p) {
  return `
  <div class="tab-section${activeTab==='details'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Phase information</p><p class="card-sub">Core metadata — saves directly to Supabase</p></div>
        <button class="btn-primary" id="save-details-btn">Save to DB</button>
      </div>
      <div class="fg fg-3">
        <div class="ff"><label class="fl">Phase code</label><input class="fi" id="f-code" value="${esc(p.code)}"/></div>
        <div class="ff"><label class="fl">Timeline</label><input class="fi" id="f-month" value="${esc(p.month)}"/></div>
        <div class="ff"><label class="fl">Amount</label><input class="fi" id="f-amount" value="${esc(p.amount)}"/></div>
      </div>
      <div class="fg" style="margin-top:.875rem">
        <div class="ff"><label class="fl">Phase title</label><input class="fi" id="f-title" value="${esc(p.title)}"/></div>
      </div>
      <div class="fg fg-3" style="margin-top:.875rem">
        <div class="ff"><label class="fl">Status</label>${sel(STATUS, p.status, 'fs fsel-status')}</div>
        <div class="ff"><label class="fl">Health</label>${sel(HEALTH, p.health, 'fs fsel-health')}</div>
        <div class="ff"><label class="fl">Progress — <span id="pct-lbl">${p.progress}%</span></label>
          <input type="range" min="0" max="100" value="${p.progress}" class="progress-range" id="f-progress"/>
        </div>
      </div>
      <div class="fg fg-2" style="margin-top:.875rem">
        <div class="ff"><label class="fl">Owner</label><input class="fi" id="f-owner" value="${esc(p.owner)}"/></div>
        <div class="ff"><label class="fl">Client action</label><input class="fi" id="f-action" value="${esc(p.clientAction)}"/></div>
      </div>
      <div class="fg fg-2" style="margin-top:.875rem">
        <div class="ff"><label class="fl">Update note</label><textarea class="fta" id="f-note" rows="4">${esc(p.updateNote)}</textarea></div>
        <div class="ff"><label class="fl">Decision / dependency</label><textarea class="fta" id="f-decision" rows="4">${esc(p.decision)}</textarea></div>
      </div>
    </div>
    <div class="danger-zone">
      <p class="danger-zone-title">⚠ Danger zone</p>
      <p class="danger-zone-desc">Permanently delete this phase and all its tasks, risks and evidence from Supabase.</p>
      <button class="btn-danger full-danger" id="delete-phase-btn">Delete phase "${esc(p.code)}" from database</button>
    </div>
  </div>`;
}

/* ── Tasks tab ────────────────────────────────────────── */
function renderTasksTab(p) {
  const rows = p.tasks.map((t, i) => `
    <div class="task-row" data-ti="${i}">
      <input class="fi task-name" value="${esc(t.name)}" placeholder="Task name"/>
      ${sel(PRIORITY, t.priority, 'fs task-priority')}
      <input class="fi task-owner" value="${esc(t.owner)}" placeholder="Owner"/>
      ${sel(STATUS, t.status, 'fs task-status')}
      <button class="del-item-btn del-task-btn" data-ti="${i}" title="Delete task">×</button>
    </div>`).join('') || '<p class="empty-msg">No tasks yet. Add one below.</p>';
  return `
  <div class="tab-section${activeTab==='tasks'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Work breakdown</p><p class="card-sub">Edit tasks — changes go directly to Supabase</p></div>
        <div style="display:flex;gap:.625rem">
          <button class="btn-add" id="add-task-btn">+ Add task</button>
          <button class="btn-primary" id="save-tasks-btn">Save tasks to DB</button>
        </div>
      </div>
      <div id="task-list">${rows}</div>
    </div>
  </div>`;
}

/* ── Risks & Evidence tab ─────────────────────────────── */
function renderListsTab(p) {
  const riskItems = p.risks.map((r, i) => `
    <div class="dyn-item" data-ri="${i}">
      <input class="fi risk-input" value="${esc(r.text || r)}" placeholder="Risk description"/>
      <button class="del-item-btn del-risk-btn" data-ri="${i}" title="Delete">×</button>
    </div>`).join('') || '<p class="empty-msg">No risks. Good!</p>';
  const evidItems = p.evidence.map((e, i) => `
    <div class="dyn-item" data-ei="${i}">
      <input class="fi evid-input" value="${esc(e.text || e)}" placeholder="Evidence item"/>
      <button class="del-item-btn del-evid-btn" data-ei="${i}" title="Delete">×</button>
    </div>`).join('') || '<p class="empty-msg">No evidence items yet.</p>';
  return `
  <div class="tab-section${activeTab==='lists'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Risks</p><p class="card-sub">Active risks for this phase</p></div>
        <div style="display:flex;gap:.625rem">
          <button class="add-item-btn" id="add-risk-btn">+ Add risk</button>
          <button class="btn-primary" id="save-lists-btn">Save to DB</button>
        </div>
      </div>
      <div class="dyn-list" id="risk-list">${riskItems}</div>
    </div>
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Evidence</p><p class="card-sub">Deliverables and proof points</p></div>
        <button class="add-item-btn" id="add-evid-btn">+ Add evidence</button>
      </div>
      <div class="dyn-list" id="evid-list">${evidItems}</div>
    </div>
  </div>`;
}

/* ── Payments tab ─────────────────────────────────────── */
function renderPaymentsTab() {
  const rows = payments.map((p, i) => `
    <div class="pay-row" data-pi="${i}">
      <input class="fi pay-trigger" value="${esc(p.trigger)}" placeholder="Payment trigger"/>
      <input class="fi pay-pct"     value="${esc(p.percent)}" placeholder="%"/>
      <input class="fi pay-amount"  value="${esc(p.amount)}"  placeholder="₹ Amount"/>
      <input class="fi pay-outcome" value="${esc(p.outcome)}" placeholder="Linked outcome"/>
      <button class="del-item-btn del-pay-btn" data-pi="${i}" title="Delete">×</button>
    </div>`).join('') || '<p class="empty-msg">No payment gates defined.</p>';
  return `
  <div class="tab-section${activeTab==='payments'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Payment schedule</p><p class="card-sub">Milestone-based payment gates — saves to Supabase</p></div>
        <div style="display:flex;gap:.625rem">
          <button class="btn-add" id="add-pay-btn">+ Add gate</button>
          <button class="btn-primary" id="save-pay-btn">Save schedule to DB</button>
        </div>
      </div>
      <div id="pay-list">${rows}</div>
    </div>
  </div>`;
}

/* ── Main render ──────────────────────────────────────── */
function render() {
  renderSidebar();
  const p = phases.find(x => x.id === activeId);
  if (!p) { $('edit-area').innerHTML = '<p style="color:var(--g60);padding:1rem">Select a phase.</p>'; return; }
  $('edit-area').innerHTML = renderTabs() + renderDetails(p) + renderTasksTab(p) + renderListsTab(p) + renderPaymentsTab();
  bindEvents(p);
}

/* ── Bind events ──────────────────────────────────────── */
function bindEvents(p) {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
    activeTab = b.dataset.tab; render();
  }));

  // Progress range live label
  $('f-progress')?.addEventListener('input', e => { $('pct-lbl').textContent = e.target.value + '%'; });

  // Save details → Supabase PATCH
  $('save-details-btn')?.addEventListener('click', async () => {
    p.code         = $('f-code').value.trim();
    p.month        = $('f-month').value.trim();
    p.amount       = $('f-amount').value.trim();
    p.title        = $('f-title').value.trim();
    p.status       = document.querySelector('.fsel-status').value;
    p.health       = document.querySelector('.fsel-health').value;
    p.progress     = parseInt($('f-progress').value);
    p.owner        = $('f-owner').value.trim();
    p.clientAction = $('f-action').value.trim();
    p.updateNote   = $('f-note').value.trim();
    p.decision     = $('f-decision').value.trim();
    await savePhaseDetails(p);
    renderSidebar();
    toast('Phase details saved ✓');
  });

  // Delete phase → Supabase DELETE
  $('delete-phase-btn')?.addEventListener('click', () => deletePhase(p));

  // Add task (local state only — save syncs to DB)
  $('add-task-btn')?.addEventListener('click', () => {
    p.tasks.push({ id: null, name: 'New task', status: 'Planned', priority: 'P1', owner: 'Owner' });
    activeTab = 'tasks'; render();
  });
  document.querySelectorAll('.del-task-btn').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this task?')) return;
    p.tasks.splice(parseInt(b.dataset.ti), 1);
    activeTab = 'tasks'; render();
  }));
  $('save-tasks-btn')?.addEventListener('click', async () => {
    const tasks = Array.from(document.querySelectorAll('.task-row')).map(r => ({
      name:     r.querySelector('.task-name').value.trim(),
      priority: r.querySelector('.task-priority').value,
      owner:    r.querySelector('.task-owner').value.trim(),
      status:   r.querySelector('.task-status').value,
    }));
    await saveTasksToDB(p, tasks);
    toast('Tasks saved ✓');
  });

  // Add / delete risks
  $('add-risk-btn')?.addEventListener('click', () => {
    p.risks.push({ id: null, text: 'New risk' });
    activeTab = 'lists'; render();
  });
  document.querySelectorAll('.del-risk-btn').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this risk?')) return;
    p.risks.splice(parseInt(b.dataset.ri), 1);
    activeTab = 'lists'; render();
  }));

  // Add / delete evidence
  $('add-evid-btn')?.addEventListener('click', () => {
    p.evidence.push({ id: null, text: 'New evidence item' });
    activeTab = 'lists'; render();
  });
  document.querySelectorAll('.del-evid-btn').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this evidence item?')) return;
    p.evidence.splice(parseInt(b.dataset.ei), 1);
    activeTab = 'lists'; render();
  }));

  // Save risks + evidence → Supabase
  $('save-lists-btn')?.addEventListener('click', async () => {
    const risks    = Array.from(document.querySelectorAll('.risk-input')).map(i => i.value.trim()).filter(Boolean);
    const evidence = Array.from(document.querySelectorAll('.evid-input')).map(i => i.value.trim()).filter(Boolean);
    await saveListsToDB(p, risks, evidence);
    toast('Risks & evidence saved ✓');
  });

  // Payments
  $('add-pay-btn')?.addEventListener('click', () => {
    payments.push({ id: null, trigger: 'New milestone', percent: '0%', amount: '₹0', outcome: 'Linked outcome' });
    activeTab = 'payments'; render();
  });
  document.querySelectorAll('.del-pay-btn').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this payment gate?')) return;
    payments.splice(parseInt(b.dataset.pi), 1);
    activeTab = 'payments'; render();
  }));
  $('save-pay-btn')?.addEventListener('click', async () => {
    const gates = Array.from(document.querySelectorAll('.pay-row')).map(r => ({
      trigger: r.querySelector('.pay-trigger').value.trim(),
      percent: r.querySelector('.pay-pct').value.trim(),
      amount:  r.querySelector('.pay-amount').value.trim(),
      outcome: r.querySelector('.pay-outcome').value.trim(),
    }));
    await savePaymentsToDB(gates);
    toast('Payment schedule saved ✓');
  });
}

/* ── Global buttons ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  $('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  $('reload-btn')?.addEventListener('click', () => loadFromDB());

  $('add-phase-btn')?.addEventListener('click', async () => {
    const maxOrder = phases.reduce((m, p) => Math.max(m, p.sort_order || 0), 0);
    saving = true;
    showStatus('Creating new phase…', 'info');
    try {
      const [created] = await sbFetch('phases', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          code: 'NEW', month: 'M?', title: 'New Phase',
          status: 'Planned', health: 'On Track', progress: 0,
          amount: '₹0.00L', owner: 'Team',
          client_action: 'Pending', decision: 'To be defined.',
          update_note: 'Phase not yet started.',
          sort_order: maxOrder + 1
        })
      });
      activeId = created.id;
      activeTab = 'details';
      showStatus('New phase created ✓', 'ok');
      await loadFromDB();
    } catch(e) {
      showStatus('Create failed: ' + e.message, 'error');
    }
    saving = false;
  });

  // Auto-unlock if session is still active
  await loadConfig(); // load Supabase key from server before any DB call
  if (sessionStorage.getItem(SESSION_KEY) === 'granted') {
    $('lock-screen').style.display = 'none';
    $('admin-shell').style.display = 'block';
    loadFromDB();
  } else {
    setTimeout(() => $('pw-input')?.focus(), 100);
  }
});

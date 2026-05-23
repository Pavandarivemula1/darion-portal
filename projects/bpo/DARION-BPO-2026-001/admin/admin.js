/* ── Config ───────────────────────────────────────────── */
const CORRECT_PW = 'BPO@Admin26';
const LS_KEY = 'bpo_phases_001';
const LS_PAY = 'bpo_payments_001';
const SESSION_KEY = 'bpo_admin_session';

/* ── Helpers ──────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const sel = (opts,val,cls) => `<select class="${cls}">${opts.map(o=>`<option value="${esc(o)}"${o===val?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
const STATUS = ["Not Started","Planned","In Progress","At Risk","Blocked","Completed"];
const HEALTH  = ["Healthy","On Track","Watch","At Risk","Blocked"];
const PRIORITY= ["P0","P1","P2"];

/* ── Default data ─────────────────────────────────────── */
const DEFAULT_PHASES = [
  {id:1,code:"DISC",month:"M1",progress:100,status:"Completed",health:"Healthy",amount:"₹3.00L",title:"Discovery, Scope Lock & Delivery Blueprint",owner:"Business Analyst + Technical Lead",clientAction:"Approved",decision:"BRD/FRD, role matrix and phase-level acceptance rules locked.",updateNote:"Discovery is complete. Delivery assumptions, module boundaries and approval checkpoints are baselined.",risks:["No active risk"],evidence:["Signed scope baseline","Role and permission matrix","Architecture outline","Acceptance checklist"],tasks:[{name:"SRS walkthrough and scope boundary confirmation",status:"Completed",priority:"P0",owner:"BA"},{name:"BRD/FRD confirmation with module-wise acceptance rules",status:"Completed",priority:"P0",owner:"BA"},{name:"User roles, permissions and tenant access model",status:"Completed",priority:"P0",owner:"Tech Lead"},{name:"High-level architecture and data model draft",status:"Completed",priority:"P1",owner:"Tech Lead"},{name:"Delivery governance, demo cadence and sign-off workflow",status:"Completed",priority:"P1",owner:"PM"}]},
  {id:2,code:"CORE",month:"M2",progress:68,status:"In Progress",health:"Healthy",amount:"₹4.00L",title:"Platform Foundation, Access Control & DevOps Base",owner:"Backend + DevOps",clientAction:"Review access roles",decision:"RBAC and tenant isolation need final role validation before foundation sign-off.",updateNote:"Authentication and base APIs are stable. RBAC, tenant isolation and CI/CD hardening are in progress.",risks:["Delay in final user role approval can shift foundation sign-off"],evidence:["Login flow demo","API base structure","Repository workflow","RBAC draft"],tasks:[{name:"Authentication, secure session and password flow",status:"Completed",priority:"P0",owner:"Backend"},{name:"RBAC policy mapping for Admin, Supervisor, Agent and QA",status:"In Progress",priority:"P0",owner:"Backend"},{name:"Tenant/account isolation and workspace boundaries",status:"In Progress",priority:"P0",owner:"Backend"},{name:"Base API structure, error model and logging conventions",status:"Completed",priority:"P1",owner:"Backend"},{name:"CI/CD pipeline, environment separation and secure repo rules",status:"Planned",priority:"P1",owner:"DevOps"}]},
  {id:3,code:"CRM",month:"M3",progress:0,status:"Planned",health:"On Track",amount:"₹4.50L",title:"CRM, Case Management & Agent Workspace",owner:"Frontend + Backend",clientAction:"Provide sample customer/case data",decision:"Case fields, customer profile fields and interaction categories must be confirmed before build start.",updateNote:"Ready for execution after foundation sign-off. Client sample data is required for realistic screens and flows.",risks:["Missing sample data can make CRM screens generic"],evidence:["CRM wireframe","Case schema draft","Agent workflow draft"],tasks:[{name:"Customer profile, account and contact information layout",status:"Planned",priority:"P0",owner:"Frontend"},{name:"Ticket/case creation, assignment and lifecycle states",status:"Planned",priority:"P0",owner:"Backend"},{name:"Agent desktop with daily work queue and case context",status:"Planned",priority:"P0",owner:"Frontend"},{name:"Notes, activity timeline and interaction tracking",status:"Planned",priority:"P1",owner:"Full Stack"},{name:"Search, filters and supervisor review visibility",status:"Planned",priority:"P1",owner:"Full Stack"}]},
  {id:4,code:"ACD",month:"M4",progress:0,status:"Planned",health:"On Track",amount:"₹4.50L",title:"Queue, Basic ACD Rules & Live Operations View",owner:"Backend + Realtime",clientAction:"Confirm routing rules",decision:"Queue priority, agent availability rules and escalation conditions must be approved.",updateNote:"ACD will be implemented as a controlled work distribution layer with real-time supervisor visibility.",risks:["Complex telecom-grade ACD is outside current fixed platform scope"],evidence:["Queue rule draft","Supervisor live view concept","Agent status model"],tasks:[{name:"Queue configuration by team, skill and priority",status:"Planned",priority:"P0",owner:"Backend"},{name:"Agent availability, status and capacity control",status:"Planned",priority:"P0",owner:"Backend"},{name:"Basic routing logic for case/work distribution",status:"Planned",priority:"P0",owner:"Backend"},{name:"WebSocket live events for queue and agent state",status:"Planned",priority:"P1",owner:"Realtime"},{name:"Supervisor live operations console",status:"Planned",priority:"P1",owner:"Frontend"}]},
  {id:5,code:"WFM",month:"M5–M6",progress:0,status:"Planned",health:"On Track",amount:"₹3.50L",title:"Workforce Management & QA Review System",owner:"Full Stack + QA",clientAction:"Share shift policies and QA scorecard format",decision:"Shift rules, attendance logic and QA parameters must be agreed before implementation.",updateNote:"This phase creates supervisor control for workforce planning and quality review evidence.",risks:["Unclear QA scorecard criteria can delay review workflows"],evidence:["WFM module plan","QA scorecard draft","Attendance model draft"],tasks:[{name:"Shift creation, roster view and assignment workflow",status:"Planned",priority:"P0",owner:"Full Stack"},{name:"Attendance, availability and exception records",status:"Planned",priority:"P0",owner:"Backend"},{name:"QA scorecard builder and scoring workflow",status:"Planned",priority:"P0",owner:"Full Stack"},{name:"Review notes, evidence references and audit trail",status:"Planned",priority:"P1",owner:"Backend"},{name:"Supervisor team schedule and QA summary views",status:"Planned",priority:"P1",owner:"Frontend"}]},
  {id:6,code:"BI",month:"M7",progress:0,status:"Planned",health:"On Track",amount:"₹4.00L",title:"Reports, Insights & Supervisor Command Center",owner:"Analytics + Frontend",clientAction:"Confirm report formats",decision:"Management KPIs and report export expectations must be finalized before dashboard build.",updateNote:"Reporting phase turns operational records into clean dashboards and decision-ready summaries.",risks:["Changing KPIs late can increase dashboard rework"],evidence:["Dashboard KPI list","Report catalogue draft","Supervisor analytics wireframe"],tasks:[{name:"Case volume, status and ageing reports",status:"Planned",priority:"P0",owner:"Analytics"},{name:"Agent productivity and status reports",status:"Planned",priority:"P0",owner:"Analytics"},{name:"WFM schedule and attendance dashboards",status:"Planned",priority:"P1",owner:"Frontend"},{name:"QA performance and review summary reports",status:"Planned",priority:"P1",owner:"Analytics"},{name:"Supervisor command center with operational KPIs",status:"Planned",priority:"P0",owner:"Frontend"}]},
  {id:7,code:"SHIP",month:"M8",progress:0,status:"Planned",health:"On Track",amount:"₹4.50L",title:"Security Hardening, UAT, Deployment & Handover",owner:"Tech Lead + QA + DevOps",clientAction:"Complete UAT and final sign-off",decision:"Production deployment depends on cloud/domain/provider decisions from client or partner.",updateNote:"Final phase validates stability, fixes critical issues, completes documentation and supports handover.",risks:["Delayed UAT feedback can shift final handover date"],evidence:["Security checklist","UAT tracker","Deployment runbook","KT plan"],tasks:[{name:"Security hardening, audit logs and access review",status:"Planned",priority:"P0",owner:"Security"},{name:"End-to-end UAT support and defect triage",status:"Planned",priority:"P0",owner:"QA"},{name:"Deployment assistance and environment verification",status:"Planned",priority:"P0",owner:"DevOps"},{name:"Admin, supervisor and user handover documentation",status:"Planned",priority:"P1",owner:"Tech Writer"},{name:"Knowledge transfer and final acceptance pack",status:"Planned",priority:"P1",owner:"Tech Lead"}]},
];
const DEFAULT_PAYMENTS = [
  {id:1,trigger:"Advance on approval",percent:"20%",amount:"₹5,60,000",outcome:"Project kickoff, discovery and resource booking"},
  {id:2,trigger:"Foundation sign-off",percent:"15%",amount:"₹4,20,000",outcome:"Architecture, access control and base platform completion"},
  {id:3,trigger:"CRM + Agent module",percent:"15%",amount:"₹4,20,000",outcome:"CRM, ticket/case flow and agent workbench review"},
  {id:4,trigger:"ACD + live operations",percent:"15%",amount:"₹4,20,000",outcome:"Queue, routing and live status module completion"},
  {id:5,trigger:"WFM + QA module",percent:"15%",amount:"₹4,20,000",outcome:"Workforce and quality review module completion"},
  {id:6,trigger:"Dashboards + UAT",percent:"10%",amount:"₹2,80,000",outcome:"Reports, UAT support and security hardening"},
  {id:7,trigger:"Final handover",percent:"10%",amount:"₹2,80,000",outcome:"Deployment support, documentation and knowledge transfer"},
];

/* ── State ────────────────────────────────────────────── */
let phases = JSON.parse(JSON.stringify(DEFAULT_PHASES));
let payments = JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
let activeId = 2;
let activeTab = 'details';
let nextId = 100;

/* ── Persistence ──────────────────────────────────────── */
function loadSaved() {
  try {
    const p = localStorage.getItem(LS_KEY);
    if (p) phases = JSON.parse(p);
    const pay = localStorage.getItem(LS_PAY);
    if (pay) payments = JSON.parse(pay);
  } catch(e) {}
}
function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify(phases));
  localStorage.setItem(LS_PAY, JSON.stringify(payments));
  toast();
}

/* ── Toast ────────────────────────────────────────────── */
function toast() {
  const t = $('toast');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2800);
}

/* ── Auth ─────────────────────────────────────────────── */
function unlock() {
  if ($('pw-input').value === CORRECT_PW) {
    sessionStorage.setItem(SESSION_KEY,'granted');
    $('lock-screen').style.display='none';
    $('admin-shell').style.display='block';
    loadSaved();
    render();
  } else {
    $('lock-error').textContent='Incorrect key. Try again.';
    $('pw-input').value='';
    $('pw-input').focus();
    setTimeout(()=>$('lock-error').textContent='',3000);
  }
}
$('pw-submit').addEventListener('click', unlock);
$('pw-input').addEventListener('keydown', e=>{ if(e.key==='Enter') unlock(); });

/* ── Sidebar ──────────────────────────────────────────── */
function renderSidebar() {
  $('phase-nav').innerHTML = phases.map(p=>`
    <button class="phase-nav-btn${p.id===activeId?' active':''}" data-id="${p.id}">
      <p class="pnb-meta">${esc(p.code)} · ${esc(p.month)}</p>
      <p class="pnb-title">${esc(p.title)}</p>
      <p class="pnb-status" style="color:${statusColor(p.status)}">${esc(p.status)} · ${p.progress}%</p>
    </button>`).join('');
  $('phase-nav').querySelectorAll('.phase-nav-btn').forEach(b=>
    b.addEventListener('click',()=>{ activeId=parseInt(b.dataset.id); activeTab='details'; render(); }));
}
function statusColor(s){
  return s==='Completed'?'#0e6027':s==='In Progress'?'#0043ce':s==='At Risk'?'#684e00':s==='Blocked'?'#a2191f':'#525252';
}

/* ── Tab switcher ─────────────────────────────────────── */
function renderTabs() {
  const tabs = [
    {id:'details', label:'Phase details'},
    {id:'tasks',   label:'Tasks'},
    {id:'lists',   label:'Risks & Evidence'},
    {id:'payments',label:'Payment schedule'},
  ];
  return `<div class="section-tabs">
    ${tabs.map(t=>`<button class="tab-btn${activeTab===t.id?' active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
  </div>`;
}

/* ── Details tab ──────────────────────────────────────── */
function renderDetails(p) {
  return `
  <div class="tab-section${activeTab==='details'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Phase information</p><p class="card-sub">Core metadata and delivery status</p></div>
        <button class="btn-primary" id="save-details-btn">Save changes</button>
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
        <div class="ff"><label class="fl">Status</label>${sel(STATUS,p.status,'fs fsel-status')}</div>
        <div class="ff"><label class="fl">Health</label>${sel(HEALTH,p.health,'fs fsel-health')}</div>
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
      <p class="danger-zone-desc">Delete this phase permanently from the portal. All tasks, risks and evidence for this phase will be removed. This action is not reversible unless you reset to defaults.</p>
      <button class="btn-danger full-danger" id="delete-phase-btn">Delete phase "${esc(p.code)}"</button>
    </div>
  </div>`;
}

/* ── Tasks tab ────────────────────────────────────────── */
function renderTasksTab(p) {
  const rows = p.tasks.map((t,i)=>`
    <div class="task-row" data-ti="${i}">
      <input class="fi task-name" value="${esc(t.name)}" placeholder="Task name"/>
      ${sel(PRIORITY,t.priority,'fs task-priority')}
      <input class="fi task-owner" value="${esc(t.owner)}" placeholder="Owner"/>
      ${sel(STATUS,t.status,'fs task-status')}
      <button class="del-item-btn del-task-btn" data-ti="${i}" title="Delete task">×</button>
    </div>`).join('') || '<p class="empty-msg">No tasks yet. Add one below.</p>';
  return `
  <div class="tab-section${activeTab==='tasks'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Work breakdown</p><p class="card-sub">Edit, add or remove individual tasks</p></div>
        <div style="display:flex;gap:.625rem">
          <button class="btn-add" id="add-task-btn">+ Add task</button>
          <button class="btn-primary" id="save-tasks-btn">Save tasks</button>
        </div>
      </div>
      <div id="task-list">${rows}</div>
    </div>
  </div>`;
}

/* ── Risks & Evidence tab ─────────────────────────────── */
function renderListsTab(p) {
  const riskItems = p.risks.map((r,i)=>`
    <div class="dyn-item" data-ri="${i}">
      <input class="fi risk-input" value="${esc(r)}" placeholder="Risk description"/>
      <button class="del-item-btn del-risk-btn" data-ri="${i}" title="Delete">×</button>
    </div>`).join('') || '<p class="empty-msg">No risks. Good!</p>';
  const evidItems = p.evidence.map((e,i)=>`
    <div class="dyn-item" data-ei="${i}">
      <input class="fi evid-input" value="${esc(e)}" placeholder="Evidence item"/>
      <button class="del-item-btn del-evid-btn" data-ei="${i}" title="Delete">×</button>
    </div>`).join('') || '<p class="empty-msg">No evidence items yet.</p>';
  return `
  <div class="tab-section${activeTab==='lists'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Risks</p><p class="card-sub">Active risks for this phase</p></div>
        <div style="display:flex;gap:.625rem">
          <button class="add-item-btn" id="add-risk-btn">+ Add risk</button>
          <button class="btn-primary" id="save-lists-btn">Save</button>
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
  const rows = payments.map((p,i)=>`
    <div class="pay-row" data-pi="${i}">
      <input class="fi pay-trigger" value="${esc(p.trigger)}" placeholder="Payment trigger"/>
      <input class="fi pay-pct" value="${esc(p.percent)}" placeholder="%"/>
      <input class="fi pay-amount" value="${esc(p.amount)}" placeholder="₹ Amount"/>
      <input class="fi pay-outcome" value="${esc(p.outcome)}" placeholder="Linked outcome"/>
      <button class="del-item-btn del-pay-btn" data-pi="${i}" title="Delete">×</button>
    </div>`).join('') || '<p class="empty-msg">No payment gates defined.</p>';
  return `
  <div class="tab-section${activeTab==='payments'?' active':''}">
    <div class="card">
      <div class="card-hd">
        <div><p class="card-title">Payment schedule</p><p class="card-sub">Milestone-based payment gates — applies across all phases</p></div>
        <div style="display:flex;gap:.625rem">
          <button class="btn-add" id="add-pay-btn">+ Add gate</button>
          <button class="btn-primary" id="save-pay-btn">Save schedule</button>
        </div>
      </div>
      <div id="pay-list">${rows}</div>
      <div class="danger-zone" style="margin-top:1.25rem">
        <p class="danger-zone-title">⚠ Danger zone</p>
        <p class="danger-zone-desc">Delete all payment gates and start fresh.</p>
        <button class="btn-danger full-danger" id="clear-pay-btn">Clear all payment gates</button>
      </div>
    </div>
  </div>`;
}

/* ── Main render ──────────────────────────────────────── */
function render() {
  renderSidebar();
  const p = phases.find(x=>x.id===activeId);
  if (!p) { $('edit-area').innerHTML='<p style="color:var(--g60);padding:1rem">Select a phase.</p>'; return; }
  $('edit-area').innerHTML = renderTabs() + renderDetails(p) + renderTasksTab(p) + renderListsTab(p) + renderPaymentsTab();
  bindEvents(p);
}

/* ── Bind events ──────────────────────────────────────── */
function bindEvents(p) {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    activeTab=b.dataset.tab; render();
  }));

  // Progress range
  $('f-progress')?.addEventListener('input',e=>{ $('pct-lbl').textContent=e.target.value+'%'; });

  // Save details
  $('save-details-btn')?.addEventListener('click',()=>{
    p.code        = $('f-code').value.trim();
    p.month       = $('f-month').value.trim();
    p.amount      = $('f-amount').value.trim();
    p.title       = $('f-title').value.trim();
    p.status      = document.querySelector('.fsel-status').value;
    p.health      = document.querySelector('.fsel-health').value;
    p.progress    = parseInt($('f-progress').value);
    p.owner       = $('f-owner').value.trim();
    p.clientAction= $('f-action').value.trim();
    p.updateNote  = $('f-note').value.trim();
    p.decision    = $('f-decision').value.trim();
    persist(); renderSidebar();
  });

  // Delete phase
  $('delete-phase-btn')?.addEventListener('click',()=>{
    if (!confirm(`Delete phase "${p.code} — ${p.title}"? This cannot be undone.`)) return;
    phases = phases.filter(x=>x.id!==p.id);
    activeId = phases[0]?.id || -1;
    persist(); render();
  });

  // ── Tasks ──
  $('add-task-btn')?.addEventListener('click',()=>{
    p.tasks.push({name:'New task',status:'Planned',priority:'P1',owner:'Owner'});
    activeTab='tasks'; render();
  });
  document.querySelectorAll('.del-task-btn').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this task?')) return;
    p.tasks.splice(parseInt(b.dataset.ti),1);
    activeTab='tasks'; render();
  }));
  $('save-tasks-btn')?.addEventListener('click',()=>{
    p.tasks = Array.from(document.querySelectorAll('.task-row')).map(r=>({
      name:    r.querySelector('.task-name').value.trim(),
      priority:r.querySelector('.task-priority').value,
      owner:   r.querySelector('.task-owner').value.trim(),
      status:  r.querySelector('.task-status').value,
    }));
    persist();
  });

  // ── Risks ──
  $('add-risk-btn')?.addEventListener('click',()=>{
    p.risks.push('New risk');
    activeTab='lists'; render();
  });
  document.querySelectorAll('.del-risk-btn').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this risk?')) return;
    p.risks.splice(parseInt(b.dataset.ri),1);
    activeTab='lists'; render();
  }));

  // ── Evidence ──
  $('add-evid-btn')?.addEventListener('click',()=>{
    p.evidence.push('New evidence item');
    activeTab='lists'; render();
  });
  document.querySelectorAll('.del-evid-btn').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this evidence item?')) return;
    p.evidence.splice(parseInt(b.dataset.ei),1);
    activeTab='lists'; render();
  }));

  // Save risks + evidence
  $('save-lists-btn')?.addEventListener('click',()=>{
    p.risks    = Array.from(document.querySelectorAll('.risk-input')).map(i=>i.value.trim()).filter(Boolean);
    p.evidence = Array.from(document.querySelectorAll('.evid-input')).map(i=>i.value.trim()).filter(Boolean);
    persist();
  });

  // ── Payments ──
  $('add-pay-btn')?.addEventListener('click',()=>{
    payments.push({id:nextId++,trigger:'New milestone',percent:'0%',amount:'₹0',outcome:'Linked outcome'});
    activeTab='payments'; render();
  });
  document.querySelectorAll('.del-pay-btn').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this payment gate?')) return;
    payments.splice(parseInt(b.dataset.pi),1);
    activeTab='payments'; render();
  }));
  $('save-pay-btn')?.addEventListener('click',()=>{
    payments = Array.from(document.querySelectorAll('.pay-row')).map((r,i)=>({
      id: payments[i]?.id || nextId++,
      trigger: r.querySelector('.pay-trigger').value.trim(),
      percent: r.querySelector('.pay-pct').value.trim(),
      amount:  r.querySelector('.pay-amount').value.trim(),
      outcome: r.querySelector('.pay-outcome').value.trim(),
    }));
    persist();
  });
  $('clear-pay-btn')?.addEventListener('click',()=>{
    if(!confirm('Clear ALL payment gates? This cannot be undone.')) return;
    payments=[];
    activeTab='payments'; persist(); render();
  });
}

/* ── Global buttons ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  $('logout-btn').addEventListener('click',()=>{ sessionStorage.removeItem(SESSION_KEY); location.reload(); });
  $('reset-btn').addEventListener('click',()=>{
    if(!confirm('Reset ALL phases and payments to defaults? This wipes all edits.')) return;
    phases = JSON.parse(JSON.stringify(DEFAULT_PHASES));
    payments = JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
    persist(); render();
  });
  $('add-phase-btn').addEventListener('click',()=>{
    const newPhase = {
      id:nextId++, code:'NEW', month:'M?', progress:0,
      status:'Planned', health:'On Track', amount:'₹0.00L',
      title:'New Phase', owner:'Team', clientAction:'Pending',
      decision:'To be defined.', updateNote:'Phase not yet started.',
      risks:['No active risk'], evidence:[], tasks:[],
    };
    phases.push(newPhase);
    activeId=newPhase.id; activeTab='details';
    persist(); render();
  });

  // Auto-unlock
  if(sessionStorage.getItem(SESSION_KEY)==='granted'){
    $('lock-screen').style.display='none';
    $('admin-shell').style.display='block';
    loadSaved(); render();
  } else {
    setTimeout(()=>$('pw-input')?.focus(),100);
  }
});

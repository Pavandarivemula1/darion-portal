/* ── Supabase config ────────────────────────────────────────── */
const SB_URL = 'https://tigxrqqykijkofgntway.supabase.co';
const SB_KEY = 'sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8';
const SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };
const PROJECT_ID = 'DARION-BPO-2026-001';

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase error ${res.status}`);
  return res.json();
}

// Load phases + nested data from Supabase, fall back to hardcoded defaults
async function loadFromSupabase() {
  try {
    const raw = await sbGet(
      `phases?project_id=eq.${PROJECT_ID}&select=*,tasks(*),phase_risks(*),phase_evidence(*)&order=sort_order`
    );
    if (!raw || !raw.length) return null;
    // Map snake_case DB cols → camelCase used by app
    return raw.map(p => ({
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
      risks:        (p.phase_risks || []).sort((a,b)=>a.sort_order-b.sort_order).map(r=>r.description),
      evidence:     (p.phase_evidence || []).sort((a,b)=>a.sort_order-b.sort_order).map(e=>e.description),
      tasks:        (p.tasks || []).sort((a,b)=>a.sort_order-b.sort_order).map(t=>({
        name: t.name, status: t.status, priority: t.priority, owner: t.owner
      }))
    }));
  } catch(e) {
    console.warn('Supabase unavailable, using local data:', e.message);
    return null;
  }
}

// Load payment gates from Supabase
async function loadPaymentsFromSupabase() {
  try {
    const raw = await sbGet(
      `payment_gates?project_id=eq.${PROJECT_ID}&order=sort_order`
    );
    if (!raw || !raw.length) return null;
    return raw.map(p => ({
      trigger: p.trigger_name, percent: p.percent,
      amount: p.amount, outcome: p.outcome
    }));
  } catch(e) { return null; }
}

// Read admin localStorage overrides (admin panel saves here as immediate cache)
function loadLocalOverrides() {
  try {
    const stored = localStorage.getItem('bpo_phases_001');
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}
const PHASES = [
  {
    id: 1, code: "DISC", month: "M1", progress: 100,
    status: "Completed", health: "Healthy", amount: "₹3.00L",
    title: "Discovery, Scope Lock & Delivery Blueprint",
    owner: "Business Analyst + Technical Lead",
    clientAction: "Approved",
    decision: "BRD/FRD, role matrix and phase-level acceptance rules locked.",
    updateNote: "Discovery is complete. Delivery assumptions, module boundaries and approval checkpoints are baselined.",
    risks: ["No active risk"],
    evidence: ["Signed scope baseline", "Role and permission matrix", "Architecture outline", "Acceptance checklist"],
    tasks: [
      { name: "SRS walkthrough and scope boundary confirmation", status: "Completed", priority: "P0", owner: "BA" },
      { name: "BRD/FRD confirmation with module-wise acceptance rules", status: "Completed", priority: "P0", owner: "BA" },
      { name: "User roles, permissions and tenant access model", status: "Completed", priority: "P0", owner: "Tech Lead" },
      { name: "High-level architecture and data model draft", status: "Completed", priority: "P1", owner: "Tech Lead" },
      { name: "Delivery governance, demo cadence and sign-off workflow", status: "Completed", priority: "P1", owner: "PM" },
    ],
  },
  {
    id: 2, code: "CORE", month: "M2", progress: 68,
    status: "In Progress", health: "Healthy", amount: "₹4.00L",
    title: "Platform Foundation, Access Control & DevOps Base",
    owner: "Backend + DevOps",
    clientAction: "Review access roles",
    decision: "RBAC and tenant isolation need final role validation before foundation sign-off.",
    updateNote: "Authentication and base APIs are stable. RBAC, tenant isolation and CI/CD hardening are in progress.",
    risks: ["Delay in final user role approval can shift foundation sign-off"],
    evidence: ["Login flow demo", "API base structure", "Repository workflow", "RBAC draft"],
    tasks: [
      { name: "Authentication, secure session and password flow", status: "Completed", priority: "P0", owner: "Backend" },
      { name: "RBAC policy mapping for Admin, Supervisor, Agent and QA", status: "In Progress", priority: "P0", owner: "Backend" },
      { name: "Tenant/account isolation and workspace boundaries", status: "In Progress", priority: "P0", owner: "Backend" },
      { name: "Base API structure, error model and logging conventions", status: "Completed", priority: "P1", owner: "Backend" },
      { name: "CI/CD pipeline, environment separation and secure repo rules", status: "Planned", priority: "P1", owner: "DevOps" },
    ],
  },
  {
    id: 3, code: "CRM", month: "M3", progress: 0,
    status: "Planned", health: "On Track", amount: "₹4.50L",
    title: "CRM, Case Management & Agent Workspace",
    owner: "Frontend + Backend",
    clientAction: "Provide sample customer/case data",
    decision: "Case fields, customer profile fields and interaction categories must be confirmed before build start.",
    updateNote: "Ready for execution after foundation sign-off. Client sample data is required for realistic screens and flows.",
    risks: ["Missing sample data can make CRM screens generic"],
    evidence: ["CRM wireframe", "Case schema draft", "Agent workflow draft"],
    tasks: [
      { name: "Customer profile, account and contact information layout", status: "Planned", priority: "P0", owner: "Frontend" },
      { name: "Ticket/case creation, assignment and lifecycle states", status: "Planned", priority: "P0", owner: "Backend" },
      { name: "Agent desktop with daily work queue and case context", status: "Planned", priority: "P0", owner: "Frontend" },
      { name: "Notes, activity timeline and interaction tracking", status: "Planned", priority: "P1", owner: "Full Stack" },
      { name: "Search, filters and supervisor review visibility", status: "Planned", priority: "P1", owner: "Full Stack" },
    ],
  },
  {
    id: 4, code: "ACD", month: "M4", progress: 0,
    status: "Planned", health: "On Track", amount: "₹4.50L",
    title: "Queue, Basic ACD Rules & Live Operations View",
    owner: "Backend + Realtime",
    clientAction: "Confirm routing rules",
    decision: "Queue priority, agent availability rules and escalation conditions must be approved.",
    updateNote: "ACD will be implemented as a controlled work distribution layer with real-time supervisor visibility.",
    risks: ["Complex telecom-grade ACD is outside current fixed platform scope"],
    evidence: ["Queue rule draft", "Supervisor live view concept", "Agent status model"],
    tasks: [
      { name: "Queue configuration by team, skill and priority", status: "Planned", priority: "P0", owner: "Backend" },
      { name: "Agent availability, status and capacity control", status: "Planned", priority: "P0", owner: "Backend" },
      { name: "Basic routing logic for case/work distribution", status: "Planned", priority: "P0", owner: "Backend" },
      { name: "WebSocket live events for queue and agent state", status: "Planned", priority: "P1", owner: "Realtime" },
      { name: "Supervisor live operations console", status: "Planned", priority: "P1", owner: "Frontend" },
    ],
  },
  {
    id: 5, code: "WFM", month: "M5–M6", progress: 0,
    status: "Planned", health: "On Track", amount: "₹3.50L",
    title: "Workforce Management & QA Review System",
    owner: "Full Stack + QA",
    clientAction: "Share shift policies and QA scorecard format",
    decision: "Shift rules, attendance logic and QA parameters must be agreed before implementation.",
    updateNote: "This phase creates supervisor control for workforce planning and quality review evidence.",
    risks: ["Unclear QA scorecard criteria can delay review workflows"],
    evidence: ["WFM module plan", "QA scorecard draft", "Attendance model draft"],
    tasks: [
      { name: "Shift creation, roster view and assignment workflow", status: "Planned", priority: "P0", owner: "Full Stack" },
      { name: "Attendance, availability and exception records", status: "Planned", priority: "P0", owner: "Backend" },
      { name: "QA scorecard builder and scoring workflow", status: "Planned", priority: "P0", owner: "Full Stack" },
      { name: "Review notes, evidence references and audit trail", status: "Planned", priority: "P1", owner: "Backend" },
      { name: "Supervisor team schedule and QA summary views", status: "Planned", priority: "P1", owner: "Frontend" },
    ],
  },
  {
    id: 6, code: "BI", month: "M7", progress: 0,
    status: "Planned", health: "On Track", amount: "₹4.00L",
    title: "Reports, Insights & Supervisor Command Center",
    owner: "Analytics + Frontend",
    clientAction: "Confirm report formats",
    decision: "Management KPIs and report export expectations must be finalized before dashboard build.",
    updateNote: "Reporting phase turns operational records into clean dashboards and decision-ready summaries.",
    risks: ["Changing KPIs late can increase dashboard rework"],
    evidence: ["Dashboard KPI list", "Report catalogue draft", "Supervisor analytics wireframe"],
    tasks: [
      { name: "Case volume, status and ageing reports", status: "Planned", priority: "P0", owner: "Analytics" },
      { name: "Agent productivity and status reports", status: "Planned", priority: "P0", owner: "Analytics" },
      { name: "WFM schedule and attendance dashboards", status: "Planned", priority: "P1", owner: "Frontend" },
      { name: "QA performance and review summary reports", status: "Planned", priority: "P1", owner: "Analytics" },
      { name: "Supervisor command center with operational KPIs", status: "Planned", priority: "P0", owner: "Frontend" },
    ],
  },
  {
    id: 7, code: "SHIP", month: "M8", progress: 0,
    status: "Planned", health: "On Track", amount: "₹4.50L",
    title: "Security Hardening, UAT, Deployment & Handover",
    owner: "Tech Lead + QA + DevOps",
    clientAction: "Complete UAT and final sign-off",
    decision: "Production deployment depends on cloud/domain/provider decisions from client or partner.",
    updateNote: "Final phase validates stability, fixes critical issues, completes documentation and supports handover.",
    risks: ["Delayed UAT feedback can shift final handover date"],
    evidence: ["Security checklist", "UAT tracker", "Deployment runbook", "KT plan"],
    tasks: [
      { name: "Security hardening, audit logs and access review", status: "Planned", priority: "P0", owner: "Security" },
      { name: "End-to-end UAT support and defect triage", status: "Planned", priority: "P0", owner: "QA" },
      { name: "Deployment assistance and environment verification", status: "Planned", priority: "P0", owner: "DevOps" },
      { name: "Admin, supervisor and user handover documentation", status: "Planned", priority: "P1", owner: "Tech Writer" },
      { name: "Knowledge transfer and final acceptance pack", status: "Planned", priority: "P1", owner: "Tech Lead" },
    ],
  },
];

const PAYMENTS = [
  { trigger: "Advance on approval",  percent: "20%", amount: "₹5,60,000", outcome: "Project kickoff, discovery and resource booking" },
  { trigger: "Foundation sign-off",  percent: "15%", amount: "₹4,20,000", outcome: "Architecture, access control and base platform completion" },
  { trigger: "CRM + Agent module",   percent: "15%", amount: "₹4,20,000", outcome: "CRM, ticket/case flow and agent workbench review" },
  { trigger: "ACD + live operations",percent: "15%", amount: "₹4,20,000", outcome: "Queue, routing and live status module completion" },
  { trigger: "WFM + QA module",      percent: "15%", amount: "₹4,20,000", outcome: "Workforce and quality review module completion" },
  { trigger: "Dashboards + UAT",     percent: "10%", amount: "₹2,80,000", outcome: "Reports, UAT support and security hardening" },
  { trigger: "Final handover",       percent: "10%", amount: "₹2,80,000", outcome: "Deployment support, documentation and knowledge transfer" },
];

/* ── Helpers ──────────────────────────────────────────────────── */
function badgeClass(status) {
  const map = {
    "Completed":   "badge-completed",
    "In Progress": "badge-inprogress",
    "Planned":     "badge-planned",
    "At Risk":     "badge-atrisk",
    "Blocked":     "badge-blocked",
    "Not Started": "badge-neutral",
    "Healthy":     "badge-completed",
    "On Track":    "badge-planned",
    "Watch":       "badge-atrisk",
  };
  return map[status] || "badge-neutral";
}

function badge(text, status) {
  return `<span class="badge ${badgeClass(status || text)}">${text}</span>`;
}

function progressBar(pct, green) {
  return `<div class="progress-track"><div class="progress-fill${green ? ' green' : ''}" style="width:${pct}%"></div></div>`;
}

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── State ────────────────────────────────────────────────────── */
let activePhaseId = 1; // default: In Progress phase, or first phase
let searchQuery = "";

/* ── Hero Stats ───────────────────────────────────────────────── */
function updateHeroStats() {
  const total = Math.round(PHASES.reduce((s, p) => s + p.progress, 0) / PHASES.length);
  const allTasks = PHASES.flatMap(p => p.tasks);
  const done = allTasks.filter(t => t.status === "Completed").length;
  const active = PHASES.find(p => p.status === "In Progress") || PHASES[0];

  document.getElementById("hero-pct").textContent = total + "%";
  document.getElementById("hero-bar").style.width = total + "%";
  document.getElementById("stat-overall").textContent = total + "%";
  document.getElementById("stat-phase").textContent = active.code;
  document.getElementById("stat-phase-status").textContent = active.status;
  document.getElementById("stat-tasks").textContent = `${done}/${allTasks.length}`;
}

/* ── Stepper ──────────────────────────────────────────────────── */
function renderStepper() {
  const el = document.getElementById("stepper");
  el.innerHTML = PHASES.map((phase, i) => {
    let cls = "step planned";
    let dotInner = "";
    if (phase.status === "Completed") {
      cls = "step completed";
      dotInner = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else if (phase.status === "In Progress") {
      cls = "step in-progress";
    }
    if (phase.id === activePhaseId) cls += " active";

    const connector = i < PHASES.length - 1
      ? `<div class="step-connector${phase.status === 'Completed' ? ' filled' : ''}"></div>`
      : "";

    return `
      <div class="${cls}" data-phase-id="${phase.id}" role="tab" tabindex="0" aria-label="${esc(phase.title)}">
        <div class="step-line">
          ${i === 0 ? "" : '<div class="step-connector' + (PHASES[i-1].status === "Completed" ? " filled" : "") + '"></div>'}
          <div class="step-dot">${dotInner}</div>
          ${connector}
        </div>
        <div class="step-info">
          <p class="step-code">${esc(phase.code)}</p>
          <p class="step-month">${esc(phase.month)}</p>
          <p class="step-pct">${phase.progress}%</p>
        </div>
      </div>`;
  }).join("");

  el.querySelectorAll(".step").forEach(el => {
    el.addEventListener("click", () => selectPhase(parseInt(el.dataset.phaseId)));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") selectPhase(parseInt(el.dataset.phaseId)); });
  });
}

/* ── Phase List Sidebar ───────────────────────────────────────── */
function renderPhaseList() {
  const q = searchQuery.trim().toLowerCase();
  // Always show ALL phases; filter only when user types a search query
  const filtered = q
    ? PHASES.filter(p => `${p.code} ${p.title} ${p.status} ${p.clientAction} ${p.decision} ${p.updateNote}`.toLowerCase().includes(q))
    : PHASES;

  const el = document.getElementById("phase-list");
  if (!filtered.length) {
    el.innerHTML = `<p class="empty-state">No phases match your search.</p>`;
    return;
  }

  el.innerHTML = filtered.map(phase => `
    <button
      class="phase-btn${phase.id === activePhaseId ? " active" : ""}"
      data-phase-id="${phase.id}"
      role="tab"
      aria-selected="${phase.id === activePhaseId}"
      aria-label="${esc(phase.title)}"
    >
      <div class="phase-btn-top">
        <div>
          <p class="phase-btn-meta">${esc(phase.month)} · ${esc(phase.code)}</p>
          <p class="phase-btn-title">${esc(phase.title)}</p>
        </div>
        <span class="phase-btn-pct">${phase.progress}%</span>
      </div>
      <div class="phase-btn-bar">${progressBar(phase.progress, phase.status === "Completed")}</div>
    </button>
  `).join("");

  el.querySelectorAll(".phase-btn").forEach(btn => {
    btn.addEventListener("click", () => selectPhase(parseInt(btn.dataset.phaseId)));
  });
}

/* ── Detail Panel ─────────────────────────────────────────────── */
function renderDetail() {
  const phase = PHASES.find(p => p.id === activePhaseId);
  if (!phase) return;

  const taskRows = phase.tasks.map(t => `
    <tr>
      <td data-label="Task">${esc(t.name)}</td>
      <td data-label="Priority"><span style="font-size:11px;font-weight:600;color:var(--g70)">${esc(t.priority)}</span></td>
      <td data-label="Owner">${esc(t.owner)}</td>
      <td data-label="Status">${badge(t.status)}</td>
    </tr>
  `).join("");

  const evidenceItems = phase.evidence.map(e => `<div class="evidence-item">${esc(e)}</div>`).join("");
  const riskItems = phase.risks.map(r => `<div class="risk-item">${esc(r)}</div>`).join("");

  // Client actions
  const hasAction = phase.clientAction && phase.clientAction !== "Approved";
  const actionsHtml = hasAction ? `
    <div class="actions-card">
      <div class="actions-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="white" stroke-width="1.5"/>
          <path d="M8 5v3.5M8 10.5v.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="actions-body">
        <p class="actions-title">Action required from your side</p>
        <ul class="actions-list">
          <li>${esc(phase.clientAction)}</li>
          ${phase.decision ? `<li>${esc(phase.decision)}</li>` : ""}
        </ul>
      </div>
    </div>
  ` : `
    <div class="actions-card" style="border-left-color:var(--green-50);background:var(--green-10);border-color:var(--green-10)">
      <div class="actions-icon" style="background:var(--green-50)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8l3.5 3.5L13 5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="actions-body">
        <p class="actions-title" style="color:var(--green-60)">No open actions for this phase</p>
        <p style="font-size:13px;color:var(--gray-70)">${esc(phase.clientAction)} — this phase is complete.</p>
      </div>
    </div>
  `;

  document.getElementById("detail-panel").innerHTML = `
    <div class="detail-panel">

      <!-- Phase header card -->
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-title-area">
            <div class="detail-badges">
              ${badge(phase.status)}
              ${badge(phase.health)}
              <span class="badge badge-neutral">${esc(phase.month)}</span>
              <span class="badge badge-neutral">${esc(phase.amount)}</span>
            </div>
            <h2 class="detail-title">${esc(phase.title)}</h2>
            <p class="detail-note">${esc(phase.updateNote)}</p>
          </div>
          <div class="detail-readiness">
            <p class="readiness-label">Phase readiness</p>
            <p class="readiness-value">${phase.progress}%</p>
            ${progressBar(phase.progress, phase.status === "Completed")}
          </div>
        </div>

        <div class="info-row">
          <div class="info-cell">
            <p class="info-cell-label">Owner</p>
            <p class="info-cell-value">${esc(phase.owner)}</p>
          </div>
          <div class="info-cell">
            <p class="info-cell-label">Client action</p>
            <p class="info-cell-value">${esc(phase.clientAction)}</p>
          </div>
          <div class="info-cell">
            <p class="info-cell-label">Decision / dependency</p>
            <p class="info-cell-value">${esc(phase.decision)}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      ${actionsHtml}

      <!-- Work breakdown + side panels -->
      <div class="sub-grid">
        <div class="detail-card">
          <div class="section-header">
            <p class="section-eyebrow">Execution detail</p>
            <h3 class="section-title">Work breakdown</h3>
            <p class="section-desc">Task-level progress with owner, priority and status.</p>
          </div>
          <div class="table-wrap">
            <table aria-label="Task breakdown for ${esc(phase.title)}">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Priority</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${taskRows}</tbody>
            </table>
          </div>
        </div>

        <div class="side-panels">
          <div class="side-panel">
            <h3 class="side-panel-title">Evidence</h3>
            ${evidenceItems}
          </div>
          <div class="side-panel">
            <h3 class="side-panel-title">Risks</h3>
            ${riskItems}
          </div>
        </div>
      </div>

    </div>
  `;
}

/* ── Payment Table ────────────────────────────────────────────── */
function renderPayments() {
  document.getElementById("payment-tbody").innerHTML = PAYMENTS.map(p => `
    <tr>
      <td data-label="Trigger">${esc(p.trigger)}</td>
      <td data-label="%"><strong>${esc(p.percent)}</strong></td>
      <td data-label="Amount"><strong>${esc(p.amount)}</strong></td>
      <td data-label="Outcome">${esc(p.outcome)}</td>
    </tr>
  `).join("");
}

/* ── Select Phase ─────────────────────────────────────────────── */
function selectPhase(id) {
  activePhaseId = id;
  renderStepper();
  renderPhaseList();
  renderDetail();
  // Scroll detail into view on mobile
  if (window.innerWidth < 1056) {
    document.getElementById("detail-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ── Budget Accordion ─────────────────────────────────────────── */
function initBudgetToggle() {
  const btn = document.getElementById("budget-toggle");
  const content = document.getElementById("budget-content");
  btn.addEventListener("click", () => {
    const isOpen = content.classList.contains("open");
    content.classList.toggle("open", !isOpen);
    btn.classList.toggle("open", !isOpen);
    btn.setAttribute("aria-expanded", String(!isOpen));
    btn.innerHTML = isOpen
      ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 10L3 5h10L8 10z" fill="currentColor"/></svg> View budget breakdown`
      : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 6L3 11h10L8 6z" fill="currentColor"/></svg> Hide budget breakdown`;
  });
}

/* ── Search ───────────────────────────────────────────────────── */
function initSearch() {
  document.getElementById("phase-search").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderPhaseList();
  });
}

/* ── Nav Date ─────────────────────────────────────────────────── */
function setNavDate() {
  const d = new Date();
  document.getElementById("nav-date").textContent = d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

/* ── Init ─────────────────────────────────────────────────────── */
async function init() {
  setNavDate();

  // 1) Try Supabase — this is the source of truth
  const sbPhases = await loadFromSupabase();
  if (sbPhases && sbPhases.length) {
    PHASES.length = 0;
    sbPhases.forEach(p => PHASES.push(p));
    // Auto-select the first In Progress phase from real DB data
    const inProgress = PHASES.find(p => p.status === 'In Progress');
    if (inProgress) activePhaseId = inProgress.id;
    else activePhaseId = PHASES[0].id;
  } else {
    // 2) Fall back to localStorage overrides
    const overrides = loadLocalOverrides();
    if (overrides) {
      overrides.forEach(o => {
        const idx = PHASES.findIndex(p => p.id === o.id);
        if (idx !== -1) Object.assign(PHASES[idx], o);
      });
    }
    const inProgress = PHASES.find(p => p.status === 'In Progress');
    if (inProgress) activePhaseId = inProgress.id;
  }

  // Load payments from Supabase if available
  const sbPayments = await loadPaymentsFromSupabase();
  if (sbPayments && sbPayments.length) {
    PAYMENTS.length = 0;
    sbPayments.forEach(p => PAYMENTS.push(p));
  }

  updateHeroStats();
  renderStepper();
  renderPhaseList();
  renderDetail();
  renderPayments();
  initBudgetToggle();
  initSearch();

  // Create or restore chat session ID (used by chat widget for Supabase logging)
  try {
    let sid = localStorage.getItem('bpo_chat_sid');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('bpo_chat_sid', sid);
      fetch(`${SB_URL}/rest/v1/chat_sessions`, {
        method: 'POST',
        headers: { ...SB_HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ id: sid, project_id: PROJECT_ID })
      }).catch(() => {});
    }
    window.__chatSessionId = sid;
  } catch(e) {}

  // Live sync when admin saves in another tab
  window.addEventListener('storage', e => {
    if (e.key === 'bpo_phases_001') location.reload();
  });

  // Animate hero progress bar on load
  requestAnimationFrame(() => {
    const total = Math.round(PHASES.reduce((s, p) => s + p.progress, 0) / PHASES.length);
    setTimeout(() => {
      document.getElementById("hero-bar").style.width = total + "%";
    }, 200);
  });
}

document.addEventListener("DOMContentLoaded", init);


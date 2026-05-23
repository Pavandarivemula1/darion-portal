-- ═══════════════════════════════════════════════════════
-- DARION BPO Portal — Supabase Migration 001
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════

-- ── Schema ──────────────────────────────────────────────
create table if not exists projects (
  id text primary key,
  title text not null,
  description text,
  total_value text,
  duration text,
  created_at timestamptz default now()
);

create table if not exists phases (
  id serial primary key,
  project_id text references projects(id) on delete cascade,
  code text not null,
  month text not null,
  title text not null,
  status text not null default 'Planned',
  health text not null default 'On Track',
  progress int not null default 0 check (progress between 0 and 100),
  amount text,
  owner text,
  client_action text,
  decision text,
  update_note text,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id serial primary key,
  phase_id int references phases(id) on delete cascade,
  name text not null,
  status text not null default 'Planned',
  priority text not null default 'P1',
  owner text,
  sort_order int not null default 0
);

create table if not exists phase_risks (
  id serial primary key,
  phase_id int references phases(id) on delete cascade,
  description text not null,
  sort_order int default 0
);

create table if not exists phase_evidence (
  id serial primary key,
  phase_id int references phases(id) on delete cascade,
  description text not null,
  sort_order int default 0
);

create table if not exists payment_gates (
  id serial primary key,
  project_id text references projects(id) on delete cascade,
  trigger_name text not null,
  percent text not null,
  amount text not null,
  outcome text not null,
  sort_order int not null default 0
);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id text references projects(id) on delete cascade,
  started_at timestamptz default now(),
  message_count int default 0
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','ai')),
  content text not null,
  kb_matched boolean default false,
  gemini_used boolean default false,
  created_at timestamptz default now()
);

create table if not exists chat_escalations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  question text not null,
  email_sent boolean default false,
  email_sent_at timestamptz,
  created_at timestamptz default now()
);

-- ── updated_at trigger ───────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger phases_updated_at
  before update on phases
  for each row execute function touch_updated_at();

-- ── RLS — disable for admin-controlled tables ────────────
alter table projects       enable row level security;
alter table phases         enable row level security;
alter table tasks          enable row level security;
alter table phase_risks    enable row level security;
alter table phase_evidence enable row level security;
alter table payment_gates  enable row level security;
alter table chat_sessions  enable row level security;
alter table chat_messages  enable row level security;
alter table chat_escalations enable row level security;

-- Public: full access via anon key (tighten with service role later)
create policy "anon_all_projects"   on projects       for all using (true) with check (true);
create policy "anon_all_phases"     on phases         for all using (true) with check (true);
create policy "anon_all_tasks"      on tasks          for all using (true) with check (true);
create policy "anon_all_risks"      on phase_risks    for all using (true) with check (true);
create policy "anon_all_evidence"   on phase_evidence for all using (true) with check (true);
create policy "anon_all_payments"   on payment_gates  for all using (true) with check (true);
create policy "anon_all_sessions"   on chat_sessions  for all using (true) with check (true);
create policy "anon_all_messages"   on chat_messages  for all using (true) with check (true);
create policy "anon_all_escalations" on chat_escalations for all using (true) with check (true);

-- ── Seed: Project ────────────────────────────────────────
insert into projects(id,title,description,total_value,duration) values
('DARION-BPO-2026-001','Omnichannel BPO Platform','Full-stack BPO platform covering CRM, ACD, WFM, QA and BI.','₹28,00,000','8 months')
on conflict(id) do nothing;

-- ── Seed: Phases ─────────────────────────────────────────
insert into phases(project_id,code,month,title,status,health,progress,amount,owner,client_action,decision,update_note,sort_order) values
('DARION-BPO-2026-001','DISC','M1','Discovery, Scope Lock & Delivery Blueprint','Completed','Healthy',100,'₹3.00L','Business Analyst + Technical Lead','Approved','BRD/FRD, role matrix and phase-level acceptance rules locked.','Discovery is complete. Delivery assumptions, module boundaries and approval checkpoints are baselined.',1),
('DARION-BPO-2026-001','CORE','M2','Platform Foundation, Access Control & DevOps Base','In Progress','Healthy',68,'₹4.00L','Backend + DevOps','Review access roles','RBAC and tenant isolation need final role validation before foundation sign-off.','Authentication and base APIs are stable. RBAC, tenant isolation and CI/CD hardening are in progress.',2),
('DARION-BPO-2026-001','CRM','M3','CRM, Case Management & Agent Workspace','Planned','On Track',0,'₹4.50L','Frontend + Backend','Provide sample customer/case data','Case fields, customer profile fields and interaction categories must be confirmed before build start.','Ready for execution after foundation sign-off. Client sample data is required for realistic screens and flows.',3),
('DARION-BPO-2026-001','ACD','M4','Queue, Basic ACD Rules & Live Operations View','Planned','On Track',0,'₹4.50L','Backend + Realtime','Confirm routing rules','Queue priority, agent availability rules and escalation conditions must be approved.','ACD will be implemented as a controlled work distribution layer with real-time supervisor visibility.',4),
('DARION-BPO-2026-001','WFM','M5–M6','Workforce Management & QA Review System','Planned','On Track',0,'₹3.50L','Full Stack + QA','Share shift policies and QA scorecard format','Shift rules, attendance logic and QA parameters must be agreed before implementation.','This phase creates supervisor control for workforce planning and quality review evidence.',5),
('DARION-BPO-2026-001','BI','M7','Reports, Insights & Supervisor Command Center','Planned','On Track',0,'₹4.00L','Analytics + Frontend','Confirm report formats','Management KPIs and report export expectations must be finalized before dashboard build.','Reporting phase turns operational records into clean dashboards and decision-ready summaries.',6),
('DARION-BPO-2026-001','SHIP','M8','Security Hardening, UAT, Deployment & Handover','Planned','On Track',0,'₹4.50L','Tech Lead + QA + DevOps','Complete UAT and final sign-off','Production deployment depends on cloud/domain/provider decisions from client or partner.','Final phase validates stability, fixes critical issues, completes documentation and supports handover.',7);

-- ── Seed: Tasks ──────────────────────────────────────────
insert into tasks(phase_id,name,status,priority,owner,sort_order) values
(1,'SRS walkthrough and scope boundary confirmation','Completed','P0','BA',1),
(1,'BRD/FRD confirmation with module-wise acceptance rules','Completed','P0','BA',2),
(1,'User roles, permissions and tenant access model','Completed','P0','Tech Lead',3),
(1,'High-level architecture and data model draft','Completed','P1','Tech Lead',4),
(1,'Delivery governance, demo cadence and sign-off workflow','Completed','P1','PM',5),
(2,'Authentication, secure session and password flow','Completed','P0','Backend',1),
(2,'RBAC policy mapping for Admin, Supervisor, Agent and QA','In Progress','P0','Backend',2),
(2,'Tenant/account isolation and workspace boundaries','In Progress','P0','Backend',3),
(2,'Base API structure, error model and logging conventions','Completed','P1','Backend',4),
(2,'CI/CD pipeline, environment separation and secure repo rules','Planned','P1','DevOps',5),
(3,'Customer profile, account and contact information layout','Planned','P0','Frontend',1),
(3,'Ticket/case creation, assignment and lifecycle states','Planned','P0','Backend',2),
(3,'Agent desktop with daily work queue and case context','Planned','P0','Frontend',3),
(3,'Notes, activity timeline and interaction tracking','Planned','P1','Full Stack',4),
(3,'Search, filters and supervisor review visibility','Planned','P1','Full Stack',5),
(4,'Queue configuration by team, skill and priority','Planned','P0','Backend',1),
(4,'Agent availability, status and capacity control','Planned','P0','Backend',2),
(4,'Basic routing logic for case/work distribution','Planned','P0','Backend',3),
(4,'WebSocket live events for queue and agent state','Planned','P1','Realtime',4),
(4,'Supervisor live operations console','Planned','P1','Frontend',5),
(5,'Shift creation, roster view and assignment workflow','Planned','P0','Full Stack',1),
(5,'Attendance, availability and exception records','Planned','P0','Backend',2),
(5,'QA scorecard builder and scoring workflow','Planned','P0','Full Stack',3),
(5,'Review notes, evidence references and audit trail','Planned','P1','Backend',4),
(5,'Supervisor team schedule and QA summary views','Planned','P1','Frontend',5),
(6,'Case volume, status and ageing reports','Planned','P0','Analytics',1),
(6,'Agent productivity and status reports','Planned','P0','Analytics',2),
(6,'WFM schedule and attendance dashboards','Planned','P1','Frontend',3),
(6,'QA performance and review summary reports','Planned','P1','Analytics',4),
(6,'Supervisor command center with operational KPIs','Planned','P0','Frontend',5),
(7,'Security hardening, audit logs and access review','Planned','P0','Security',1),
(7,'End-to-end UAT support and defect triage','Planned','P0','QA',2),
(7,'Deployment assistance and environment verification','Planned','P0','DevOps',3),
(7,'Admin, supervisor and user handover documentation','Planned','P1','Tech Writer',4),
(7,'Knowledge transfer and final acceptance pack','Planned','P1','Tech Lead',5);

-- ── Seed: Risks ──────────────────────────────────────────
insert into phase_risks(phase_id,description,sort_order) values
(1,'No active risk',1),
(2,'Delay in final user role approval can shift foundation sign-off',1),
(3,'Missing sample data can make CRM screens generic',1),
(4,'Complex telecom-grade ACD is outside current fixed platform scope',1),
(5,'Unclear QA scorecard criteria can delay review workflows',1),
(6,'Changing KPIs late can increase dashboard rework',1),
(7,'Delayed UAT feedback can shift final handover date',1);

-- ── Seed: Evidence ───────────────────────────────────────
insert into phase_evidence(phase_id,description,sort_order) values
(1,'Signed scope baseline',1),(1,'Role and permission matrix',2),(1,'Architecture outline',3),(1,'Acceptance checklist',4),
(2,'Login flow demo',1),(2,'API base structure',2),(2,'Repository workflow',3),(2,'RBAC draft',4),
(3,'CRM wireframe',1),(3,'Case schema draft',2),(3,'Agent workflow draft',3),
(4,'Queue rule draft',1),(4,'Supervisor live view concept',2),(4,'Agent status model',3),
(5,'WFM module plan',1),(5,'QA scorecard draft',2),(5,'Attendance model draft',3),
(6,'Dashboard KPI list',1),(6,'Report catalogue draft',2),(6,'Supervisor analytics wireframe',3),
(7,'Security checklist',1),(7,'UAT tracker',2),(7,'Deployment runbook',3),(7,'KT plan',4);

-- ── Seed: Payments ───────────────────────────────────────
insert into payment_gates(project_id,trigger_name,percent,amount,outcome,sort_order) values
('DARION-BPO-2026-001','Advance on approval','20%','₹5,60,000','Project kickoff, discovery and resource booking',1),
('DARION-BPO-2026-001','Foundation sign-off','15%','₹4,20,000','Architecture, access control and base platform completion',2),
('DARION-BPO-2026-001','CRM + Agent module','15%','₹4,20,000','CRM, ticket/case flow and agent workbench review',3),
('DARION-BPO-2026-001','ACD + live operations','15%','₹4,20,000','Queue, routing and live status module completion',4),
('DARION-BPO-2026-001','WFM + QA module','15%','₹4,20,000','Workforce and quality review module completion',5),
('DARION-BPO-2026-001','Dashboards + UAT','10%','₹2,80,000','Reports, UAT support and security hardening',6),
('DARION-BPO-2026-001','Final handover','10%','₹2,80,000','Deployment support, documentation and knowledge transfer',7);

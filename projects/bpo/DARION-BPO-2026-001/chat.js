/* ── Knowledge Base ──────────────────────────────────────────── */
// Built from project data + manual FAQs
function getDynamicKB() {
  const activePhase = (typeof PHASES !== 'undefined' && PHASES.length) ? (PHASES.find(p => p.status === 'In Progress') || PHASES[0]) : {code:'CORE', title:'Platform Foundation', month:'M2', progress:68, updateNote:'', clientAction:'Review access roles', decision:'', risks:['Delay in final user role approval can shift foundation sign-off'], evidence:['Login flow demo', 'API base structure', 'Repository workflow', 'RBAC draft']};
  const m1 = (typeof PHASES !== 'undefined' && PHASES.length) ? PHASES.find(p => p.code === 'DISC') : null;
  
  return [
    {
      keys: ["hello","hi","hey","start","help"],
      answer: "Hi! I'm the Darion project assistant for DARION-BPO-2026-001. Ask me about delivery phases, timelines, current status, client actions, or anything about this engagement."
    },
    {
      keys: ["timeline","duration","how long","months","schedule","when finish","complete"],
      answer: `This is an 8-month fixed-price delivery engagement. It runs across 7 phases from Discovery through Security Hardening & Handover. ${m1 && m1.status === 'Completed' ? 'Phase M1 is complete' : 'Phase M1 is ongoing'} and ${activePhase.code} (${activePhase.title}) is currently at ${activePhase.progress}%.`
    },
    {
      keys: ["status","current","active","now","phase","which phase","what phase"],
      answer: `Currently active: **${activePhase.code} — ${activePhase.title}** (${activePhase.month}) at ${activePhase.progress}% complete. ${activePhase.updateNote || ''}`
    },
    {
      keys: ["payment","cost","price","budget","amount","invoice","money","fee","commercial"],
      answer: "Payment is milestone-based across 7 gates tied to delivery outcomes. You can see the full budget breakdown by clicking 'View budget breakdown' on the portal. The total engagement is ₹28L over 8 months."
    },
    {
      keys: ["next","upcoming","next step","after","following"],
      answer: `After the current phase (${activePhase.code}) is signed off, the next planned phase will begin. Your current pending action: ${activePhase.clientAction || 'None'}.`
    },
    {
      keys: ["action","my action","what do i","client action","required","pending","i need"],
      answer: `Your current pending action: **${activePhase.clientAction || 'None'}**. ${activePhase.decision || ''}`
    },
    {
      keys: ["risk","risks","issue","problem","concern","blocking","delay"],
      answer: activePhase.risks && activePhase.risks.length ? `Current active risk: ${activePhase.risks[0]}.` : "No active risks for the current phase."
    },
    {
      keys: ["crm","case","ticket","agent","customer","m3"],
      answer: "Phase 3 (CRM, Case Management & Agent Workspace) is planned for Month 3. It covers customer profiles, ticket/case lifecycle, agent desktop, activity timeline, and search/filter."
    },
    {
      keys: ["rbac","roles","permission","access","admin","supervisor"],
      answer: "RBAC (Role-Based Access Control) maps four roles: Admin, Supervisor, Agent, and QA. This is being built in Phase 2."
    },
    {
      keys: ["devops","ci","cd","pipeline","deployment","deploy","infrastructure"],
      answer: "CI/CD pipeline, environment separation, and secure repo rules are handled in Phase 2 (CORE). Cloud/domain/provider decisions for production deployment will be needed in Phase 7."
    },
    {
      keys: ["discovery","scope","brd","frd","m1","phase 1","complete","done"],
      answer: "Phase 1 (Discovery) is complete. Deliverables: Signed scope baseline, role and permission matrix, architecture outline, and acceptance checklist."
    },
    {
      keys: ["wfm","workforce","shift","attendance","schedule","roster","m5","m6"],
      answer: "Phase 5 (Workforce Management & QA Review System) covers shift creation, roster view, attendance tracking, QA scorecard builder, and supervisor views."
    },
    {
      keys: ["report","dashboard","analytics","bi","kpi","insight","m7"],
      answer: "Phase 6 (Reports, Insights & Supervisor Command Center) is planned for Month 7. It covers case reports, agent productivity reports, WFM dashboards, QA summaries, and a supervisor command center."
    },
    {
      keys: ["uat","testing","handover","go live","production","launch","m8","final"],
      answer: "Phase 7 (Security Hardening, UAT, Deployment & Handover) is the final phase in Month 8. It covers security hardening, end-to-end UAT, deployment assistance, documentation, and knowledge transfer."
    },
    {
      keys: ["evidence","proof","deliverable","artifact","demo","document"],
      answer: `For the current active phase (${activePhase.code}), evidence includes: ${(activePhase.evidence || []).join(', ')}. All phase evidence is visible in the detail panel.`
    },
    {
      keys: ["contact","reach","email","darion","team","support","help"],
      answer: "For direct queries, you can reach the Darion delivery team at support@darion.in. Or use this chat — if I can't answer, I'll escalate directly to the team."
    },
    {
      keys: ["acd","queue","routing","ivr","live","real time","operations","m4"],
      answer: "Phase 4 (Queue, Basic ACD Rules & Live Operations View) handles work distribution, agent availability, basic routing logic, WebSocket live events, and a supervisor console."
    },
  ];
}

/* ── Score query against KB ────────────────────────────────────── */
function matchKB(query) {
  const q = query.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return null;

  let best = { score: 0, answer: null };

  getDynamicKB().forEach(entry => {
    // How many query words hit any key in this entry?
    const matchedWords = words.filter(w =>
      entry.keys.some(k => w.includes(k) || k.includes(w))
    ).length;

    // Also reward a direct substring match on the full query
    const fullHit = entry.keys.some(k => q.includes(k)) ? 0.5 : 0;

    // Score = max(matched_words / total_words, full_hit_bonus)
    const score = Math.max(matchedWords / words.length, fullHit);

    if (score > best.score) best = { score, answer: entry.answer };
  });

  // Return answer if score is reasonable (≥ 0.4 or any full hit)
  return best.score >= 0.4 ? best.answer : null;
}

/* ── Call DeepSeek AI via /api/chat ────────────────────────────── */
async function askGemini(question) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, session_id: localStorage.getItem('bpo_chat_sid') || window.__chatSessionId || null })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.answer || null;
  } catch { return null; }
}

/* ── Send to support ────────────────────────────────────────────── */
async function sendToSupport(question) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      ref: 'DARION-BPO-2026-001',
      session_id: localStorage.getItem('bpo_chat_sid') || window.__chatSessionId || null
    })
  });
  return res.ok;
}

/* ── Widget ────────────────────────────────────────────────────── */
(function() {
  let isOpen = false;
  let pendingQuestion = '';
  const messages = [];

  async function loadHistory() {
    const sid = localStorage.getItem('bpo_chat_sid') || window.__chatSessionId;
    if (!sid) {
      messages.push({ role: 'ai', text: "Hi! I'm the Darion project assistant. Ask me about your BPO platform delivery — phases, timelines, actions, or anything about this engagement." });
      renderMessages();
      return;
    }
    
    try {
      const res = await fetch(`https://tigxrqqykijkofgntway.supabase.co/rest/v1/chat_messages?session_id=eq.${sid}&order=created_at.asc`, {
        headers: {
          'apikey': 'sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8',
          'Authorization': 'Bearer sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8'
        }
      });
      if (res.ok) {
        const msgs = await res.json();
        if (msgs.length > 0) {
          msgs.forEach(m => {
            messages.push({ role: m.role, text: m.content, time: new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
          });
        } else {
          messages.push({ role: 'ai', text: "Hi! I'm the Darion project assistant. Ask me about your BPO platform delivery — phases, timelines, actions, or anything about this engagement." });
        }
        renderMessages();
      } else {
        throw new Error('Failed to load history');
      }
    } catch(e) {
      if (messages.length === 0) {
        messages.push({ role: 'ai', text: "Hi! I'm the Darion project assistant. Ask me about your BPO platform delivery — phases, timelines, actions, or anything about this engagement." });
        renderMessages();
      }
    }
  }

  function timeStr() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessages() {
    const container = document.getElementById('chat-msg-list');
    if (!container) return;
    container.innerHTML = messages.map(m => {
      if (m.type === 'escalation') return m.html;
      return `
        <div class="msg ${m.role}">
          <div class="msg-bubble">${m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          <span class="msg-time">${m.time || ''}</span>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function addMessage(role, text, type) {
    messages.push({ role, text, time: timeStr(), type });
    renderMessages();
  }

  function showTyping() {
    const container = document.getElementById('chat-msg-list');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'msg ai';
    el.id = 'typing-indicator';
    el.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('typing-indicator')?.remove();
  }

  function showEscalation(question) {
    const container = document.getElementById('chat-msg-list');
    if (!container) return;
    const id = 'esc-' + Date.now();
    messages.push({
      role: 'ai',
      type: 'escalation',
      html: `
        <div class="msg ai" id="${id}">
          <div class="escalation-card">
            <p>I don't have a specific answer for that. Would you like me to send this to the Darion team? They'll respond within 1 business day.</p>
            <div class="esc-actions">
              <button class="esc-btn-primary" id="${id}-send">✉ Send to support</button>
              <button class="esc-btn-secondary" id="${id}-skip">No thanks</button>
            </div>
          </div>
          <span class="msg-time">${timeStr()}</span>
        </div>`
    });
    renderMessages();
    document.getElementById(`${id}-send`)?.addEventListener('click', async () => {
      const btn = document.getElementById(`${id}-send`);
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      const ok = await sendToSupport(question);
      const card = document.getElementById(id)?.querySelector('.escalation-card');
      if (card) card.innerHTML = ok
        ? '<p class="esc-sent">✓ Sent! The team will reply to you at support@darion.in within 1 business day.</p>'
        : '<p style="color:var(--red-70);font-size:12px">Could not send. Please email support@darion.in directly.</p>';
    });
    document.getElementById(`${id}-skip`)?.addEventListener('click', () => {
      const card = document.getElementById(id)?.querySelector('.escalation-card');
      if (card) card.innerHTML = '<p style="font-size:12px;color:var(--g60)">No worries — feel free to ask anything else.</p>';
    });
  }

  async function handleSend() {
    const input = document.getElementById('chat-text-input');
    const q = input?.value.trim();
    if (!q) return;
    input.value = '';
    document.getElementById('chat-send-btn').disabled = true;

    addMessage('user', q);
    showTyping();

    await new Promise(r => setTimeout(r, 600)); // feel natural

    // 1) Try local KB
    const kbAnswer = matchKB(q);
    if (kbAnswer) {
      removeTyping();
      addMessage('ai', kbAnswer);
      document.getElementById('chat-send-btn').disabled = false;
      return;
    }

    // 2) Try Gemini
    const geminiAnswer = await askGemini(q);
    removeTyping();
    if (geminiAnswer) {
      addMessage('ai', geminiAnswer);
    } else {
      // 3) Escalate
      showEscalation(q);
    }
    document.getElementById('chat-send-btn').disabled = false;
  }

  function buildWidget() {
    // FAB
    const fab = document.createElement('button');
    fab.className = 'chat-fab';
    fab.id = 'chat-fab';
    fab.setAttribute('aria-label', 'Open chat assistant');
    fab.innerHTML = `
      <svg id="chat-icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg id="chat-icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:none">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>`;
    document.body.appendChild(fab);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.id = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Project assistant');
    panel.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-dot"></div>
        <div>
          <p class="chat-header-title">Darion Assistant</p>
          <p class="chat-header-sub">DARION-BPO-2026-001 · Delivery queries</p>
        </div>
        <button class="chat-clear" id="chat-clear-btn" title="Clear chat">Clear</button>
      </div>
      <div class="chat-messages" id="chat-msg-list"></div>
      <div class="chat-input-wrap">
        <input
          type="text" id="chat-text-input" class="chat-input"
          placeholder="Ask about your project…"
          maxlength="400" autocomplete="off"
        />
        <button class="chat-send" id="chat-send-btn" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p class="chat-powered">Powered by Darion AI · support@darion.in</p>`;
    document.body.appendChild(panel);

    // Load history or render initial message
    loadHistory();

    // Toggle open/close
    fab.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      fab.classList.toggle('open', isOpen);
      document.getElementById('chat-icon-open').style.display = isOpen ? 'none' : '';
      document.getElementById('chat-icon-close').style.display = isOpen ? '' : 'none';
      if (isOpen) setTimeout(() => document.getElementById('chat-text-input')?.focus(), 250);
    });

    document.getElementById('chat-send-btn').addEventListener('click', handleSend);
    document.getElementById('chat-text-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    document.getElementById('chat-clear-btn').addEventListener('click', () => {
      messages.length = 0;
      messages.push({ role: 'ai', text: "Chat cleared. What would you like to know about your BPO platform delivery?" });
      renderMessages();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();

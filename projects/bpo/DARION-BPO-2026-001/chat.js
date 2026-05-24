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
  // Key is loaded from /api/config — never hardcoded
  let _sbKey = '';

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
          'apikey': _sbKey,
          'Authorization': `Bearer ${_sbKey}`
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

    // Route directly to Gemini (DeepSeek via backend) so context + DB is used
    const geminiAnswer = await askGemini(q);
    removeTyping();
    if (geminiAnswer) {
      addMessage('ai', geminiAnswer);
    } else {
      // Escalate if AI fails
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
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(cfg => {
      if (cfg && cfg.supabaseKey) _sbKey = cfg.supabaseKey;
      loadHistory();
    }).catch(() => loadHistory());

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

// /api/chat.js — DeepSeek-powered project assistant with full DB context
// Env vars: DEEPSEEK_API_KEY, SUPABASE_ANON_KEY

const SUPABASE_URL = 'https://tigxrqqykijkofgntway.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// ── Fetch full project context from Supabase ────────────────────
async function getFullProjectContext() {
  try {
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

    // Fetch all phases with full nested data
    const [phasesRes, paymentsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/phases?project_id=eq.DARION-BPO-2026-001&select=*,tasks(*),phase_risks(*),phase_evidence(*)&order=sort_order`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/payment_gates?project_id=eq.DARION-BPO-2026-001&order=sort_order`, { headers })
    ]);

    if (!phasesRes.ok) throw new Error('Phases fetch failed');

    const phases = await phasesRes.json();
    const payments = paymentsRes.ok ? await paymentsRes.json() : [];

    if (!phases || !phases.length) throw new Error('No phases returned');

    const activePhase = phases.find(p => p.status === 'In Progress') || phases[0];
    const overallProgress = Math.round(phases.reduce((s, p) => s + p.progress, 0) / phases.length);
    const allTasks = phases.flatMap(p => p.tasks || []);
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;

    // Build rich phase details for each phase
    const phaseDetails = phases.map(p => {
      const tasks = (p.tasks || []).sort((a, b) => a.sort_order - b.sort_order);
      const risks = (p.phase_risks || []).sort((a, b) => a.sort_order - b.sort_order).map(r => r.description);
      const evidence = (p.phase_evidence || []).sort((a, b) => a.sort_order - b.sort_order).map(e => e.description);
      const completedCount = tasks.filter(t => t.status === 'Completed').length;
      return `
### Phase ${p.sort_order}: ${p.code} — ${p.title} (${p.month})
- **Status**: ${p.status} | **Health**: ${p.health} | **Progress**: ${p.progress}%
- **Budget**: ${p.amount} | **Owner**: ${p.owner}
- **Update**: ${p.update_note || 'No update'}
- **Client Action Required**: ${p.client_action || 'None'}
- **Decision/Dependency**: ${p.decision || 'None'}
- **Tasks** (${completedCount}/${tasks.length} completed):
${tasks.map(t => `  - [${t.status}] ${t.name} (${t.priority}, ${t.owner})`).join('\n')}
- **Evidence**: ${evidence.length ? evidence.join(', ') : 'None'}
- **Risks**: ${risks.length ? risks.join('; ') : 'None'}`;
    }).join('\n');

    // Payment gate details
    const paymentDetails = payments.map(p =>
      `- ${p.trigger_name}: ${p.percent} = ${p.amount} → ${p.outcome}`
    ).join('\n');

    const prompt = `You are the dedicated AI project assistant for **DARION-BPO-2026-001** — an Omnichannel BPO Platform delivery by Darion Technologies.

You have full, live access to the project database. Answer questions intelligently and in detail. You can explain costs, justify decisions, compare phases, give opinions on project health, and answer complex questions like "is this overpriced?", "why is phase 2 taking long?", "what should we expect next?".

## PROJECT OVERVIEW
- **Project**: Omnichannel BPO Platform — DARION-BPO-2026-001
- **Duration**: 8-month fixed-price engagement
- **Total Value**: ₹28,00,000 (₹28 lakhs)
- **Overall Progress**: ${overallProgress}% (${completedTasks}/${allTasks.length} tasks done)
- **Current Active Phase**: ${activePhase.code} — ${activePhase.title} (${activePhase.progress}%)
- **Delivery Contact**: support@darion.in

## PAYMENT STRUCTURE (7 milestone gates)
${paymentDetails || '- Data unavailable'}

## ALL PHASES — LIVE DATA
${phaseDetails}

## HOW TO RESPOND
- Be helpful, direct, and professional
- For cost/budget questions: explain the value delivered per phase and overall ROI
- For "why" questions: reason from the technical work described in tasks
- For risk questions: reference actual risks from the data
- For status questions: quote exact percentages and task counts from the data
- For complex/opinion questions: give a balanced, data-backed answer
- Maximum response: 5 sentences (be concise but complete)
- If genuinely unsure: say "I'll check with the Darion team — email support@darion.in"
- Never make up data not in this context`;

    return prompt;
  } catch (e) {
    console.error('Context build error:', e.message);
    return getDefaultPrompt();
  }
}

function getDefaultPrompt() {
  return `You are the project assistant for DARION-BPO-2026-001 — an Omnichannel BPO Platform delivery by Darion Technologies.
- 8-month fixed-price engagement, total value ₹28 lakhs
- 7 phases: DISC (M1, 100%), CORE (M2, 68% in progress), CRM/ACD/WFM/BI/SHIP (planned)
- Payment: 7 milestone gates — 20% advance, then 15%/15%/15%/15%/10%/10%
- Contact: support@darion.in
Answer project questions concisely and helpfully. Max 5 sentences.`;
}

// ── Rate limiter ────────────────────────────────────────────────
const reqLog = new Map();
function isRateLimited(ip) {
  const now = Date.now(), windowMs = 3600000, key = ip || 'anon';
  if (!reqLog.has(key)) reqLog.set(key, []);
  const times = reqLog.get(key).filter(t => now - t < windowMs);
  if (times.length >= 60) return true; // increased limit to 60/hr
  times.push(now); reqLog.set(key, times); return false;
}

// ── Supabase log helper ─────────────────────────────────────────
async function sbLog(table, row) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });
  } catch(e) { /* non-critical */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { question, session_id } = req.body || {};
  if (!question || typeof question !== 'string' || question.trim().length < 2)
    return res.status(400).json({ error: 'Invalid question' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

  // Log user message (fire-and-forget)
  if (session_id) {
    sbLog('chat_messages', {
      session_id, role: 'user',
      content: question.slice(0, 1000),
      kb_matched: false, gemini_used: false
    });
  }

  try {
    // Build full context from DB every time (ensures live data)
    const sysPrompt = await getFullProjectContext();

    // Build messages with chat history for memory
    const messagesPayload = [{ role: 'system', content: sysPrompt }];

    if (session_id) {
      try {
        const hRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${session_id}&order=created_at.desc&limit=8`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (hRes.ok) {
          const past = await hRes.json();
          // Reverse to chronological order, exclude the message we just logged
          past.reverse().slice(0, -1).forEach(m => {
            messagesPayload.push({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content
            });
          });
        }
      } catch (e) { /* ignore history error */ }
    }

    messagesPayload.push({ role: 'user', content: question.slice(0, 1000) });

    const dsRes = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messagesPayload,
        max_tokens: 500,   // increased for richer answers
        temperature: 0.4,  // slightly more natural
        stream: false
      })
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text().catch(() => '');
      console.error('DeepSeek error:', dsRes.status, errText);
      return res.status(502).json({ error: 'AI unavailable' });
    }

    const data = await dsRes.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) return res.status(502).json({ error: 'No answer from AI' });

    // Log AI reply
    if (session_id) {
      sbLog('chat_messages', {
        session_id, role: 'ai',
        content: answer,
        kb_matched: false, gemini_used: true
      });
    }

    return res.status(200).json({ answer });
  } catch (err) {
    console.error('DeepSeek fetch error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// /api/admin-save.js — Protected admin write endpoint
// Writes phase/task/risk/evidence/payment changes to Supabase
import { supabase } from '../lib/supabase.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'BPO@Admin26';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify admin secret header
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const { action, data } = req.body || {};
  if (!action || !data) return res.status(400).json({ error: 'Missing action or data' });

  try {
    let result;

    if (action === 'save_phase') {
      // Upsert phase core fields
      const { id, code, month, title, status, health, progress, amount,
              owner, client_action, decision, update_note, sort_order } = data;
      const { error } = await supabase.from('phases').upsert({
        id, code, month, title, status, health, progress, amount,
        owner, client_action, decision, update_note, sort_order
      });
      if (error) throw error;
      result = { ok: true };
    }

    else if (action === 'save_tasks') {
      // Replace all tasks for a phase
      const { phase_id, tasks } = data;
      await supabase.from('tasks').delete().eq('phase_id', phase_id);
      if (tasks.length) {
        const rows = tasks.map((t, i) => ({
          phase_id, name: t.name, status: t.status,
          priority: t.priority, owner: t.owner, sort_order: i + 1
        }));
        const { error } = await supabase.from('tasks').insert(rows);
        if (error) throw error;
      }
      result = { ok: true };
    }

    else if (action === 'save_risks') {
      const { phase_id, risks } = data;
      await supabase.from('phase_risks').delete().eq('phase_id', phase_id);
      if (risks.length) {
        const { error } = await supabase.from('phase_risks').insert(
          risks.map((r, i) => ({ phase_id, description: r, sort_order: i + 1 }))
        );
        if (error) throw error;
      }
      result = { ok: true };
    }

    else if (action === 'save_evidence') {
      const { phase_id, evidence } = data;
      await supabase.from('phase_evidence').delete().eq('phase_id', phase_id);
      if (evidence.length) {
        const { error } = await supabase.from('phase_evidence').insert(
          evidence.map((e, i) => ({ phase_id, description: e, sort_order: i + 1 }))
        );
        if (error) throw error;
      }
      result = { ok: true };
    }

    else if (action === 'delete_phase') {
      const { id } = data;
      const { error } = await supabase.from('phases').delete().eq('id', id);
      if (error) throw error;
      result = { ok: true };
    }

    else if (action === 'add_phase') {
      const { error, data: newPhase } = await supabase
        .from('phases').insert(data).select().single();
      if (error) throw error;
      result = { ok: true, phase: newPhase };
    }

    else if (action === 'save_payments') {
      const { project_id, payments } = data;
      await supabase.from('payment_gates').delete().eq('project_id', project_id);
      if (payments.length) {
        const { error } = await supabase.from('payment_gates').insert(
          payments.map((p, i) => ({
            project_id,
            trigger_name: p.trigger,
            percent: p.percent,
            amount: p.amount,
            outcome: p.outcome,
            sort_order: i + 1
          }))
        );
        if (error) throw error;
      }
      result = { ok: true };
    }

    else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('admin-save error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

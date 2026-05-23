import fs from 'fs';

async function run() {
  const token = 'sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8';
  
  // fetch all phases
  const res = await fetch('https://tigxrqqykijkofgntway.supabase.co/rest/v1/phases?project_id=eq.DARION-BPO-2026-001', {
    headers: {
      'apikey': token,
      'Authorization': 'Bearer ' + token
    }
  });
  
  const phases = await res.json();
  for (const p of phases) {
    if (p.status.includes('\n')) {
      const cleanStatus = p.status.replace(/\n/g, '').trim();
      console.log(`Updating phase ${p.id} from "${p.status}" to "${cleanStatus}"`);
      await fetch(`https://tigxrqqykijkofgntway.supabase.co/rest/v1/phases?id=eq.${p.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': token,
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: cleanStatus })
      });
    }
  }
  console.log("Done.");
}

run();

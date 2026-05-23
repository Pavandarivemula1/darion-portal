import fs from 'fs';
import path from 'path';

const envPath = path.resolve('/home/pavan/BPO Client/darionos-portal/projects/bpo/DARION-BPO-2026-001/.env');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

import handler from './api/chat.js';

const req = {
  method: 'POST',
  headers: {},
  body: {
    question: 'What is the status of M2?',
    session_id: 'test_123'
  }
};
const res = {
  status: (code) => {
    console.log('Status:', code);
    return {
      json: (data) => console.log('JSON:', JSON.stringify(data, null, 2))
    };
  }
};

async function run() {
  await handler(req, res);
}
run();

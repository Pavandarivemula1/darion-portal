const SB_KEY = 'test_key';
const SB_HDR = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

const opts = {
  method: 'POST',
  headers: { 'Prefer': 'return=minimal' }
};

const { headers: customHeaders = {}, ...restOpts } = opts;
const finalOpts = {
  headers: { ...SB_HDR, ...customHeaders },
  ...restOpts
};

console.log(finalOpts);

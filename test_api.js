const https = require('https');

const req = https.request('https://lightcyan-shark-136321.hostingersite.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log("LOGIN RESPONSE:", data);
  });
});
req.write(JSON.stringify({email: 'admin@jlautos.com', password: 'admin'}));
req.end();

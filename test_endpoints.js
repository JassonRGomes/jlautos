const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('https://lightcyan-shark-136321.hostingersite.com/api/auth/login', {
      email: 'admin@jlautos.com',
      password: 'administrator'
    });
    const token = loginRes.data.token;
    
    const endpoints = [
      '/api/vehicles/favorites',
      '/api/vehicles/saved-searches',
      '/api/bookings/my',
      '/api/offers/my'
    ];

    for (const ep of endpoints) {
      try {
        const res = await axios.get(`https://lightcyan-shark-136321.hostingersite.com${ep}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[SUCCESS] ${ep} - Status: ${res.status}`);
      } catch (err) {
        console.log(`[ERROR] ${ep} - Status: ${err.response ? err.response.status : err.message}`);
      }
    }
  } catch (err) {
    console.error('Login failed:', err.response ? err.response.data : err.message);
  }
}
test();

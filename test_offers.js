const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('https://lightcyan-shark-136321.hostingersite.com/api/auth/login', {
      email: 'admin@jlautos.com',
      password: 'Password123!'
    });
    const token = loginRes.data.token;
    
    const offersRes = await axios.get('https://lightcyan-shark-136321.hostingersite.com/api/offers/manager', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Offers length:', offersRes.data.data.length);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();

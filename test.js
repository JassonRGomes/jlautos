const axios = require('axios');
const wrapper = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');

const jar = new tough.CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

async function test() {
  try {
    const res = await client.post('http://localhost:5001/api/auth/login', {
      email: 'admin@jlautos.com',
      password: 'admin'
    });
    console.log("Logged in");
    
    const endpoints = [
      '/api/vehicles',
      '/api/bookings/ledger',
      '/api/offers/manager',
      '/api/settings/customers'
    ];
    
    for (let ep of endpoints) {
      try {
        await client.get('http://localhost:5001' + ep);
        console.log(ep, "OK");
      } catch (err) {
        console.log(ep, "ERROR", err.response?.status, err.response?.data);
      }
    }
  } catch (err) {
    console.log("Login fail", err.response?.data);
  }
}
test();

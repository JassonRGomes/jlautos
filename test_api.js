const axios = require('axios');
async function test() {
  try {
    // First login
    const login = await axios.post('https://lightcyan-shark-136321.hostingersite.com/api/auth/login', {
      email: 'admin@jlautos.com',
      password: 'password123' // Wait, I don't know the admin password.
    });
  } catch(e) {}
}

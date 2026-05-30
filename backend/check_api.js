const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 'dummy', role: 'CUSTOMER' }, 'supersecretjwtkey', { expiresIn: '1h' });

axios.get('http://localhost:5000/api/bookings/my', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => {
  console.log("Bookings:", res.data);
}).catch(err => {
  console.error("Error:", err.response ? err.response.data : err.message);
});

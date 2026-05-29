// Entry point for Hostinger Node.js deployment
// Delegates to the full TypeScript-compiled backend (backend/dist/app.js)
require('dotenv').config();

const app = require('./backend/dist/app').default;

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[J&L Autos] Server running on port ${PORT} (${process.env.NODE_ENV || 'production'})`);
});

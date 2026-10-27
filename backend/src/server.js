const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');

const result = dotenv.config({
  path: envPath,
});

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
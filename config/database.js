const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mariadb',
  logging: false,
  retry: {
    max: 5, // Number of retry attempts
    match: [
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /ECONNRESET/
    ],
    backoffBase: 1000, // Initial backoff duration in ms. Default is 100ms.
    backoffExponent: 1.5 // Exponent to increase backoff duration each attempt. Default is 2.
  }
});

async function connectWithRetry() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
  }
}

connectWithRetry();

module.exports = sequelize;

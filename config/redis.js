const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = `redis://${process.env.REDIS_URL}`;

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

async function connectWithRetry(attempts = 5, backoffBase = 1000, backoffExponent = 1.5) {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully.');
  } catch (err) {
    if (attempts === 0) {
      console.error('Exhausted all retry attempts. Unable to connect to Redis:', err);
    } else {
      const backoffTime = backoffBase * Math.pow(backoffExponent, 5 - attempts);
      console.error(`Unable to connect to Redis: ${err.message}`);
      console.log(`Retrying in ${backoffTime / 1000} seconds...`);
      setTimeout(() => connectWithRetry(attempts - 1, backoffBase, backoffExponent), backoffTime);
    }
  }
}

connectWithRetry();

module.exports = redisClient;

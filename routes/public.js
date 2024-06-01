const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const rateLimit = require('express-rate-limit');

// Apply rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes."
});

router.use(limiter);

// Define the route
router.get('/qrcode/:guest_id', publicController.getGuestQRCode);

module.exports = router;

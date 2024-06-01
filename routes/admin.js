const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the directory exists
const csvDir = path.join(__dirname, '../private');
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, csvDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.use(authController.ensureAuthenticated, authController.ensureAdmin);

router.get('/users', adminController.getUsers);
router.post('/users/add', adminController.addUser);
router.get('/guests', adminController.getGuests);
router.post('/guests/add', adminController.addGuest);
router.post('/guests/upload', upload.single('csvfile'), adminController.uploadGuestsCsv);
router.post('/guests/send-invite', adminController.sendInvite);
router.get('/guests/export', adminController.exportGuests);
router.get('/attendance', adminController.getAttendance);
router.get('/attendance/export-excel', adminController.exportAttendance);

module.exports = router;

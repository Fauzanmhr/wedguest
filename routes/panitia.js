const express = require('express');
const router = express.Router();
const panitiaController = require('../controllers/panitiaController');
const authController = require('../controllers/authController');

router.use(authController.ensureAuthenticated, authController.ensurePanitia);

router.get('/attendance', panitiaController.getAttendance);
router.post('/attendance/add', panitiaController.addAttendance);
router.post('/attendance/search', panitiaController.searchGuest);
router.post('/attendance/addByQRCode', panitiaController.addAttendanceByQRCode); // New route
router.post('/attendance/addUnregistered', panitiaController.addUnregisteredGuest);
router.get('/welcome-data', panitiaController.getLastAttendee);

router.get('/welcome', (req, res) => {
    res.render('welcome');
});

module.exports = router;

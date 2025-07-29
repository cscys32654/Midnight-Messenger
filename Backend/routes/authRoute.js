const express = require('express');
const router = express.Router();
const { sendOtp, VerifyOtp } = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', VerifyOtp);

module.exports = router;

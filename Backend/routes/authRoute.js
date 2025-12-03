const express = require('express');
const router = express.Router();
const { sendOtp, VerifyOtp } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');
const authController = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', VerifyOtp);
router.get('/logout',authController.logout)

 
//protected route

router.put('/update-profile',authMiddleware,multerMiddleware,authController.updateProfile)
router.get('/check-auth',authMiddleware,authController.checkAuthenticate)
router.get('/users',authMiddleware,authController.getAllUsers);

module.exports = router;

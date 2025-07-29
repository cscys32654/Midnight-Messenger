const otpGenerate = require("../utils/otpGenerator");
const twillioService = require('../services/twillioService');
const generateToken = require("../utils/generateToken");
const User = require("../models/user");
const sendOtpEmail = require('../services/emailService');

// ✅ Step 1: Send OTP
const sendOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneSuffix, email } = req.body;

    if (!phoneNumber && !email) {
      return res.status(400).json({ message: 'Phone number or email is required' });
    }

    const otp = otpGenerate();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
    let user;

    // ✉ Email OTP
    if (email) {
      user = await User.findOne({ email }) || new User({ email });
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();

      try {
        await sendOtpEmail(email, otp);
      } catch (emailErr) {
        console.error("❌ Email send failed:", emailErr.message);
        return res.status(500).json({ message: 'Failed to send OTP to email' });
      }

      return res.status(200).json({ message: 'OTP sent to your email', email });
    }

    // 📱 Phone OTP
    if (!phoneSuffix) {
      return res.status(400).json({ message: 'Phone suffix is required' });
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber }) || new User({ phoneNumber, phoneSuffix });

    try {
      await twillioService.sendOtpToPhoneNumber(fullPhoneNumber);
    } catch (twilioErr) {
      console.error("❌ Twilio send failed:", twilioErr.message);
      return res.status(500).json({ message: 'Failed to send OTP to phone' });
    }

    await user.save();

    return res.status(200).json({ message: 'OTP sent to phone', phone: fullPhoneNumber });

  } catch (err) {
    console.error("🔥 sendOtp error:", err.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ Step 2: Verify OTP
const VerifyOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneSuffix, email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    let user;

    // ✉ Email verification
    if (email) {
      user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const now = new Date();

      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      // 📱 Phone verification
      if (!phoneNumber || !phoneSuffix) {
        return res.status(400).json({ message: 'Phone number and suffix are required' });
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const result = await twillioService.VerifyOtp(fullPhoneNumber, otp);
      if (result.status !== 'approved') {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      user.isVerified = true;
      await user.save();
    }

    // ✅ Create token
    const token = generateToken(user._id);

    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      user,
    });

  } catch (err) {
    console.error("🔥 verifyOtp error:", err.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  sendOtp,
  VerifyOtp
};

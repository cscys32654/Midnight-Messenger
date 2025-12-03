const otpGenerate = require("../utils/otpGenerator");
const twillioService = require("../services/twillioService");
const generateToken = require("../utils/generateToken");
const User = require("../models/user");
const sendOtpEmail = require("../services/emailService");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const response = require("../utils/responseHandler");
const authController = require("../controllers/authController"); // ✅ correct
const Conversation = require("../models/Conversation");

// ✅ Step 1: Send OTP
const sendOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneSuffix, email } = req.body;

    if (!phoneNumber && !email) {
      return res
        .status(400)
        .json({ message: "Phone number or email is required" });
    }

    const otp = otpGenerate();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
    let user;

    // ✉ Email OTP
    if (email) {
      user = (await User.findOne({ email })) || new User({ email });
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();

      try {
        await sendOtpEmail(email, otp);
      } catch (emailErr) {
        console.error("❌ Email send failed:", emailErr.message);
        return res.status(500).json({ message: "Failed to send OTP to email" });
      }

      return res.status(200).json({ message: "OTP sent to your email", email });
    }

    // 📱 Phone OTP
    if (!phoneSuffix) {
      return res.status(400).json({ message: "Phone suffix is required" });
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user =
      (await User.findOne({ phoneNumber })) ||
      new User({ phoneNumber, phoneSuffix });

    try {
      await twillioService.sendOtpToPhoneNumber(fullPhoneNumber);
    } catch (twilioErr) {
      console.error("❌ Twilio send failed:", twilioErr.message);
      return res.status(500).json({ message: "Failed to send OTP to phone" });
    }

    await user.save();

    return res
      .status(200)
      .json({ message: "OTP sent to phone", phone: fullPhoneNumber });
  } catch (err) {
    console.error("🔥 sendOtp error:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Step 2: Verify OTP
const VerifyOtp = async (req, res) => {
  try {
    const { phoneNumber, phoneSuffix, email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    let user;
    console.log("🔥 JWT Token Generated = ", token);
    console.log("🔥 JWT Payload = ", payload);

    // ✉ Email verification
    if (email) {
      user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      const now = new Date();

      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      // 📱 Phone verification
      if (!phoneNumber || !phoneSuffix) {
        return res
          .status(400)
          .json({ message: "Phone number and suffix are required" });
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber });
      if (!user) return res.status(404).json({ message: "User not found" });

      const result = await twillioService.VerifyOtp(fullPhoneNumber, otp);
      if (result.status !== "approved") {
        return res.status(400).json({ message: "Invalid OTP" });
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
      message: "OTP verified successfully",
      token,
      user,
    });
  } catch (err) {
    console.error("🔥 OTP verification error:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      console.log(uploadResult);
      user.ProfilePicture = uploadResult?.secure_url;
    } else if (req.body.ProfilePicture) {
      user.ProfilePicture = req.body.ProfilePicture;
    }

    if (username) user.username = username;
    if (agreed) user.agreed = agreed;
    if (about) user.about = about;
    await user.save();
    return response(res, 200, "user profile updated successfully", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

const checkAuthenticate = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return response(
        res,
        404,
        "Unauthorized! Please login before accessing the app"
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }

    return response(
      res,
      200,
      "User retrieved and allowed to use messenger",
      user
    );
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

const logout = (req, res) => {
  try {
    res.cookie("auth_token", "", { expires: new Date(0) });
    return response(res, 200, "user logout successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select(
        "username profilePicture lastseen isOnline about phoneNumber phoneSuffix"
      )
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?.userId] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver",
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );
    return response(
      res,
      200,
      "users retrived successfully",
      usersWithConversation
    );
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

module.exports = {
  sendOtp,
  VerifyOtp,
  updateProfile,
  logout,
  checkAuthenticate,
  getAllUsers,
};

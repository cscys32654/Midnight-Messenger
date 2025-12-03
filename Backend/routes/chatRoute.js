const express = require("express");
const router = express.Router();
const { sendOtp, VerifyOtp } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const chatController = require("../controllers/chatController");

//protected route
router.post(
  "/send-message",
  authMiddleware,
  multerMiddleware,
  chatController.sendMessage
);
router.get(
  "/conversations",
  authMiddleware,
  multerMiddleware,
  chatController.getConversation
);
router.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  chatController.getMessages
);

router.put("/messages/read", authMiddleware, chatController.markAsRead);

router.delete(
  "/messages/:messageId",
  authMiddleware,
  chatController.deleteMessage
);

module.exports = router;

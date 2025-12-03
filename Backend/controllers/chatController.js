const Conversation = require("../models/Conversation");
const response = require("../utils/responseHandler");
const Message = require("../models/Messages");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;

    const participants = [senderId, receiverId].sort();

    // FIND OR CREATE CONVERSATION
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    // FILE UPLOAD
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }

      imageOrVideoUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    // SAVE MESSAGE
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    // UPDATE CONVERSATION
    if (message.content) {
      conversation.lastMessage = message._id;
    }

    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    return response(res, 201, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    return response(res, 500, "Internal Server Error");
  }
};

//get all conversation
exports.getConversation = async (req, res) => {
  const userId = req.user._id;
  try {
    let conversation = await Conversation.findOne({
      participants: userId,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 201, "Conversation get successfully", conversation);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

//get message of a specific conversation
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      return response(res, 403, "Not authorized to view this conversation");
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt");
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      { $set: { messageStatus: "read" } }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, "Message retrieved", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

//
exports.markAsRead = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user._id;
  try {
    //get relevant message to determine senders
    let messages = await Message.find({
      _id: { $in: messageId },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageId },
        receiver: userId,
      },
      { $set: { messageStatus: "read" } }
    );

    return response(res, 200, "Messages marked as read", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

//to delete messages
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId.trim(); // ⭐ FIXED

    const deleted = await Message.findByIdAndDelete(messageId);

    if (!deleted) {
      return response(res, 404, "Message not found");
    }

    return response(res, 200, "Message deleted successfully", deleted);
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return response(res, 500, "Internal Server Error", err);
  }
};

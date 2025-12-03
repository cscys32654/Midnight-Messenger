const Status = require("../models/Status");
const response = require("../utils/responseHandler");
const Message = require("../models/Messages");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");

exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";
    // FILE UPLOAD
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }

      mediaUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // SAVE MESSAGE
    const status = await Message.create({
      user: userId,
      content: mediaUrl | content,
      finalContentType,
      imageOrVideoUrl,
      messageStatus,
    });

    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await status.save();

    const populatedStatus = await Message.findById(status._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    return response(res, 500, "Internal Server Error");
  }
};

exports.getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });
    return response(res, 200, "statuses retrived successfully", statuses);
  } catch (error) {
    return response(res, 500, "Internal Server Error");
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updateStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");
    } else {
      console.log("user already viewed the status");
    }

    return response(res, 200, "status viewed successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

exports.deleteStatus = async ({ req, res }) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (status.user.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this status");
    }
    await status.deleteOne();
    return response(res, 200, "status deleted successfully");
  } catch (error) {
    return response(res, 500, "Internal Server Error");
  }
};

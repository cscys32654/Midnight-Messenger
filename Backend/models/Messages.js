const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.ObjectId, ref: 'Conversation', required: true }, // ✅ Fix typo in 'Converastion'
  Sender: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  Reciever: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  content: { type: String },
  imageOrVideoUrl: { type: String },
  contentType: { type: String, enum: ['image', 'video', 'text'] },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: String
    }
  ],
  messageStatus: { type: String, default: 'send' },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema); // ✅ Define Message model
module.exports = Message;

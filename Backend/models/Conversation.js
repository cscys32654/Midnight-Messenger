const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  unreadCount: { type: Number, default: 0 }
}, { timestamps: true });

// ✅ Correct model definition
const Conversation = mongoose.model('Conversation', conversationSchema);

// ✅ Export the model, not just the schema
module.exports = Conversation;

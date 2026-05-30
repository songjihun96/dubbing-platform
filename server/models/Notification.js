const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['approved', 'revision', 'assigned', 'overdue'], required: true },
  message: { type: String, required: true },
  recording: { type: mongoose.Schema.Types.ObjectId, ref: 'Recording' },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);

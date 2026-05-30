const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  mimeType: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'revision', 'overdue'],
    default: 'pending'
  },
  feedback: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      return d;
    }
  }
});

module.exports = mongoose.model('Recording', recordingSchema);

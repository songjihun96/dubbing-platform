require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recordingRoutes = require('./routes/recordings');
const assignmentRoutes = require('./routes/assignments');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve React build in production
const clientBuild = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Cron: 3개월 지난 녹음 삭제
cron.schedule('0 0 * * *', async () => {
  try {
    const Recording = require('./models/Recording');
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const old = await Recording.find({ createdAt: { $lt: threeMonthsAgo } });
    for (const rec of old) {
      if (rec.filePath && fs.existsSync(rec.filePath)) fs.unlinkSync(rec.filePath);
    }
    const result = await Recording.deleteMany({ createdAt: { $lt: threeMonthsAgo } });
    if (result.deletedCount > 0) console.log(`🗑️ Cleaned ${result.deletedCount} old recordings`);
  } catch (err) { console.error('Cron error:', err); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

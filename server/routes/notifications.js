const router = require('express').Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// 내 알림 목록
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 읽지 않은 알림 수
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 알림 읽음 처리
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 전체 읽음 처리
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

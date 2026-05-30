const router = require('express').Router();
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const { auth, adminOnly } = require('../middleware/auth');

// 과제 생성 (관리자)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, assignedTo, deadline } = req.body;
    const assignment = new Assignment({
      title, description, assignedTo, deadline: new Date(deadline),
      assignedBy: req.user._id
    });
    await assignment.save();

    await Notification.create({
      recipient: assignedTo,
      type: 'assigned',
      message: `새 녹음 과제가 부여되었습니다: "${title}"`,
      assignment: assignment._id
    });

    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 내 과제 목록
router.get('/my', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ assignedTo: req.user._id })
      .populate('assignedBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 특정 사용자의 과제 목록 (관리자)
router.get('/user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const assignments = await Assignment.find({ assignedTo: req.params.userId })
      .populate('assignedBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 과제 수정
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { title, description, deadline: new Date(deadline) },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ message: '과제를 찾을 수 없습니다' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 과제 삭제
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: '과제가 삭제되었습니다' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

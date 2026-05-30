const router = require('express').Router();
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// 전체 사용자 목록 (관리자)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 특정 사용자 정보
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 관리자 권한 부여/해제
router.put('/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: '유효하지 않은 권한입니다' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json({ message: `권한이 ${role === 'admin' ? '관리자' : '일반 멤버'}로 변경되었습니다`, user });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 사용자 삭제
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '계정이 삭제되었습니다' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

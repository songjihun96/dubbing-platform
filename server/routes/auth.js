const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, username: user.username, displayName: user.displayName, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 현재 사용자 정보
router.get('/me', auth, (req, res) => {
  res.json({ user: { id: req.user._id, username: req.user.username, displayName: req.user.displayName, role: req.user.role } });
});

// 관리자: 계정 생성
router.post('/create-user', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;
    if (!username || !password || !displayName) return res.status(400).json({ message: '필수 항목을 입력하세요' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: '이미 존재하는 아이디입니다' });
    const user = new User({ username, password, displayName, role: role || 'member', createdBy: req.user._id });
    await user.save();
    res.status(201).json({ message: '계정이 생성되었습니다', user: { id: user._id, username: user.username, displayName: user.displayName, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 관리자: 비밀번호 변경
router.put('/change-password/:userId', auth, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    user.password = password;
    await user.save();
    res.json({ message: '비밀번호가 변경되었습니다' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 최초 관리자 계정 생성 (서버에 아무 계정도 없을 때만)
router.post('/init', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.status(400).json({ message: '이미 초기화되었습니다' });
    const { username, password, displayName } = req.body;
    const user = new User({ username, password, displayName, role: 'admin' });
    await user.save();
    res.status(201).json({ message: '최초 관리자 계정이 생성되었습니다' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

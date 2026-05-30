const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '인증이 필요합니다' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: '유효하지 않은 토큰입니다' });
    next();
  } catch (err) {
    res.status(401).json({ message: '인증에 실패했습니다' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '관리자 권한이 필요합니다' });
  next();
};

module.exports = { auth, adminOnly };

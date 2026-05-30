const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Recording = require('../models/Recording');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const { auth, adminOnly } = require('../middleware/auth');

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /audio\//;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('오디오 파일만 업로드 가능합니다'));
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 음성 파일 업로드
router.post('/upload', auth, upload.single('audio'), async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: '과제를 찾을 수 없습니다' });
    if (assignment.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '본인의 과제에만 업로드할 수 있습니다' });
    }

    const isOverdue = new Date() > new Date(assignment.deadline);
    const recording = new Recording({
      assignment: assignmentId,
      uploader: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: isOverdue ? 'overdue' : 'pending'
    });
    await recording.save();
    res.status(201).json(recording);
  } catch (err) {
    res.status(500).json({ message: err.message || '서버 오류' });
  }
});

// 내 녹음 목록
router.get('/my', auth, async (req, res) => {
  try {
    const recordings = await Recording.find({ uploader: req.user._id })
      .populate('assignment', 'title description deadline')
      .populate('reviewedBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 특정 과제의 녹음 목록 (관리자 또는 본인)
router.get('/assignment/:assignmentId', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: '과제를 찾을 수 없습니다' });
    if (req.user.role !== 'admin' && assignment.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }
    const recordings = await Recording.find({ assignment: req.params.assignmentId })
      .populate('uploader', 'displayName')
      .populate('reviewedBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 특정 사용자의 녹음 목록 (관리자)
router.get('/user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const recordings = await Recording.find({ uploader: req.params.userId })
      .populate('assignment', 'title description deadline')
      .populate('reviewedBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 파일 다운로드
router.get('/download/:id', auth, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) return res.status(404).json({ message: '파일을 찾을 수 없습니다' });
    if (req.user.role !== 'admin' && recording.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }
    res.download(recording.filePath, recording.originalName);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 파일 스트리밍 (재생)
router.get('/stream/:id', auth, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) return res.status(404).json({ message: '파일을 찾을 수 없습니다' });
    if (req.user.role !== 'admin' && recording.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }
    const stat = fs.statSync(recording.filePath);
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': recording.mimeType || 'audio/mpeg'
      });
      fs.createReadStream(recording.filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': recording.mimeType || 'audio/mpeg'
      });
      fs.createReadStream(recording.filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 상태 변경 (관리자: 승인/피드백/재녹음요청)
router.put('/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const { status, feedback } = req.body;
    if (!['approved', 'revision'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다' });
    }
    const recording = await Recording.findById(req.params.id).populate('uploader', 'displayName');
    if (!recording) return res.status(404).json({ message: '녹음을 찾을 수 없습니다' });

    recording.status = status;
    recording.feedback = feedback || '';
    recording.reviewedBy = req.user._id;
    recording.reviewedAt = new Date();
    await recording.save();

    const msgMap = { approved: '통과 처리되었습니다 ✅', revision: '피드백/재녹음 요청이 있습니다 🔄' };
    const assignment = await Assignment.findById(recording.assignment);
    await Notification.create({
      recipient: recording.uploader._id,
      type: status,
      message: `"${assignment?.title || '녹음'}" 파일이 ${msgMap[status]}`,
      recording: recording._id,
      assignment: recording.assignment
    });

    res.json(recording);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 모든 녹음 목록 (관리자)
router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const recordings = await Recording.find()
      .populate('uploader', 'displayName username')
      .populate('assignment', 'title deadline')
      .populate('reviewedBy', 'displayName')
      .sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

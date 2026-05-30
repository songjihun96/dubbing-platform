import React, { useState } from 'react';
import axios from 'axios';
import AudioPlayer from './AudioPlayer';
import { API } from '../contexts/AuthContext';
import { format, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';

const STATUS_LABEL = {
  pending: '검토 대기',
  approved: '통과',
  revision: '재녹음 요청',
  overdue: '기한 초과'
};

export default function RecordingCard({ recording, isAdmin, onReviewed }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const review = async (status) => {
    setLoading(true);
    try {
      await axios.put(`${API}/api/recordings/${recording._id}/review`, { status, feedback });
      onReviewed?.();
      setShowFeedback(false);
    } catch (err) {
      alert(err.response?.data?.message || '처리에 실패했습니다');
    } finally { setLoading(false); }
  };

  const deadline = recording.assignment?.deadline;
  const isDeadlinePast = deadline && isPast(new Date(deadline));

  return (
    <div className={`recording-card ${recording.status}`}>
      <div className="recording-card-header">
        <div>
          <div className="recording-title">{recording.assignment?.title || '녹음 파일'}</div>
          <div className="recording-meta">
            {recording.originalName} · {recording.uploader?.displayName || '본인'}
          </div>
          <div className="recording-meta" style={{ marginTop: 4 }}>
            업로드: {format(new Date(recording.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
          </div>
          {deadline && (
            <div style={{ marginTop: 4 }}>
              <span className={`deadline-chip ${isDeadlinePast ? 'passed' : ''}`}>
                마감: {format(new Date(deadline), 'MM/dd HH:mm')}
              </span>
            </div>
          )}
        </div>
        <span className={`status-badge ${recording.status}`}>
          {STATUS_LABEL[recording.status]}
        </span>
      </div>

      <AudioPlayer recording={recording} />

      {recording.feedback && (
        <div className="feedback-box">
          💬 피드백: {recording.feedback}
        </div>
      )}

      {recording.reviewedBy && (
        <div className="text-muted text-small mt-8">
          검토자: {recording.reviewedBy?.displayName} · {recording.reviewedAt && format(new Date(recording.reviewedAt), 'MM/dd HH:mm')}
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {showFeedback ? (
            <div>
              <textarea
                className="form-textarea"
                placeholder="피드백 내용을 입력하세요 (선택)"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success btn-sm" onClick={() => review('approved')} disabled={loading}>
                  ✅ 통과 처리
                </button>
                <button className="btn btn-warning btn-sm" onClick={() => review('revision')} disabled={loading}>
                  🔄 재녹음 요청
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFeedback(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFeedback(true)}>
              ✏️ 검토하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

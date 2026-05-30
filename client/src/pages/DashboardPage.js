import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import RecordingCard from '../components/RecordingCard';
import { useAuth, API } from '../contexts/AuthContext';
import { format, isPast, differenceInHours } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [tab, setTab] = useState('assignments');
  const [uploadModal, setUploadModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        axios.get(`${API}/api/assignments/my`),
        axios.get(`${API}/api/recordings/my`)
      ]);
      setAssignments(a.data);
      setRecordings(r.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const getDeadlineClass = (d) => {
    if (!d) return '';
    if (isPast(new Date(d))) return 'passed';
    if (differenceInHours(new Date(d), new Date()) < 24) return 'soon';
    return '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadModal) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('audio', selectedFile);
    fd.append('assignmentId', uploadModal._id);
    try {
      await axios.post(`${API}/api/recordings/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadModal(null);
      setSelectedFile(null);
      load();
      alert('업로드 완료!');
    } catch (err) {
      alert(err.response?.data?.message || '업로드에 실패했습니다');
    } finally { setUploading(false); }
  };

  const getAssignmentRecordings = (assignmentId) =>
    recordings.filter(r => r.assignment?._id === assignmentId);

  return (
    <Layout
      title={`안녕하세요, ${user?.displayName}님 👋`}
      subtitle="나의 녹음 과제를 확인하고 음성 파일을 업로드하세요"
    >
      <div className="tabs">
        <button className={`tab ${tab === 'assignments' ? 'active' : ''}`} onClick={() => setTab('assignments')}>
          📋 과제 목록 ({assignments.length})
        </button>
        <button className={`tab ${tab === 'recordings' ? 'active' : ''}`} onClick={() => setTab('recordings')}>
          🎙️ 내 녹음 ({recordings.length})
        </button>
      </div>

      {tab === 'assignments' && (
        assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">아직 부여된 과제가 없습니다</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {assignments.map(a => {
              const recs = getAssignmentRecordings(a._id);
              return (
                <div key={a._id} className="card">
                  <div className="flex-between mb-16">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{a.title}</div>
                      {a.description && <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{a.description}</div>}
                      <div style={{ marginTop: 8 }}>
                        <span className={`deadline-chip ${getDeadlineClass(a.deadline)}`}>
                          마감: {format(new Date(a.deadline), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                        </span>
                        {isPast(new Date(a.deadline)) && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--overdue)' }}>⚠️ 마감 초과</span>}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(a)}>
                      ⬆ 음성 업로드
                    </button>
                  </div>

                  {recs.length > 0 && (
                    <>
                      <div className="divider" />
                      <div className="section-title">제출된 녹음 ({recs.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {recs.map(r => <RecordingCard key={r._id} recording={r} isAdmin={false} onReviewed={load} />)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'recordings' && (
        recordings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎙️</div>
            <div className="empty-text">아직 제출한 녹음이 없습니다</div>
          </div>
        ) : (
          <div className="card-grid">
            {recordings.map(r => <RecordingCard key={r._id} recording={r} isAdmin={false} onReviewed={load} />)}
          </div>
        )
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⬆️ 음성 파일 업로드</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
              과제: <strong style={{ color: 'var(--text)' }}>{uploadModal.title}</strong>
            </div>

            <div
              className={`upload-zone ${dragOver ? 'drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setSelectedFile(f);
              }}
              onClick={() => document.getElementById('audio-input').click()}
            >
              <div className="upload-zone-icon">🎵</div>
              {selectedFile ? (
                <>
                  <div className="upload-zone-text" style={{ color: 'var(--approved)' }}>✅ {selectedFile.name}</div>
                  <div className="upload-zone-sub">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </>
              ) : (
                <>
                  <div className="upload-zone-text">클릭하거나 파일을 드래그하세요</div>
                  <div className="upload-zone-sub">MP3, WAV, M4A, OGG 등 오디오 파일 (최대 100MB)</div>
                </>
              )}
            </div>
            <input
              id="audio-input" type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={e => setSelectedFile(e.target.files[0])}
            />

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setUploadModal(null); setSelectedFile(null); }}>취소</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

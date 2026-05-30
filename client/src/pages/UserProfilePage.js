import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import RecordingCard from '../components/RecordingCard';
import { API } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [tab, setTab] = useState('assignments');
  const [assignModal, setAssignModal] = useState(false);
  const [assignForms, setAssignForms] = useState([{ title: '', description: '', deadline: '' }]);
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, a, r] = await Promise.all([
        axios.get(`${API}/api/users/${userId}`),
        axios.get(`${API}/api/assignments/user/${userId}`),
        axios.get(`${API}/api/recordings/user/${userId}`)
      ]);
      setProfile(p.data);
      setAssignments(a.data);
      setRecordings(r.data);
    } catch {}
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const addAssignForm = () => {
    setAssignForms(p => [...p, { title: '', description: '', deadline: '' }]);
  };

  const removeAssignForm = (i) => {
    setAssignForms(p => p.filter((_, idx) => idx !== i));
  };

  const submitAssignments = async () => {
    for (const f of assignForms) {
      if (!f.title || !f.deadline) { setAssignMsg('모든 과제의 제목과 마감일을 입력하세요'); return; }
    }
    setAssigning(true); setAssignMsg('');
    try {
      for (const f of assignForms) {
        await axios.post(`${API}/api/assignments`, {
          ...f, assignedTo: userId
        });
      }
      setAssignMsg(`✅ ${assignForms.length}개 과제가 부여되었습니다`);
      setAssignForms([{ title: '', description: '', deadline: '' }]);
      load();
      setTimeout(() => { setAssignModal(false); setAssignMsg(''); }, 1500);
    } catch (err) {
      setAssignMsg(err.response?.data?.message || '부여에 실패했습니다');
    } finally { setAssigning(false); }
  };

  const deleteAssignment = async (id) => {
    if (!window.confirm('이 과제를 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${API}/api/assignments/${id}`);
      load();
    } catch {}
  };

  const getAssignmentRecordings = (assignmentId) =>
    recordings.filter(r => r.assignment?._id === assignmentId);

  if (!profile) return (
    <div className="loading-screen"><div className="spinner" /></div>
  );

  const statusCount = { pending: 0, approved: 0, revision: 0, overdue: 0 };
  recordings.forEach(r => { if (statusCount[r.status] !== undefined) statusCount[r.status]++; });

  return (
    <Layout
      title={`${profile.displayName} 님의 프로필`}
      subtitle={`@${profile.username} · ${profile.role === 'admin' ? '관리자' : '일반 멤버'}`}
      headerActions={
        <>
          <button className="btn btn-ghost" onClick={() => navigate('/admin')}>← 목록으로</button>
          <button className="btn btn-primary" onClick={() => setAssignModal(true)}>
            📋 과제 부여
          </button>
        </>
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: '대기', count: statusCount.pending, cls: 'pending' },
          { label: '통과', count: statusCount.approved, cls: 'approved' },
          { label: '재녹음', count: statusCount.revision, cls: 'revision' },
          { label: '기한초과', count: statusCount.overdue, cls: 'overdue' }
        ].map(s => (
          <div key={s.cls} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: `var(--${s.cls})` }}>{s.count}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'assignments' ? 'active' : ''}`} onClick={() => setTab('assignments')}>
          📋 과제 ({assignments.length})
        </button>
        <button className={`tab ${tab === 'recordings' ? 'active' : ''}`} onClick={() => setTab('recordings')}>
          🎙️ 녹음 ({recordings.length})
        </button>
      </div>

      {tab === 'assignments' && (
        assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">부여된 과제가 없습니다</div>
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
                        <span className="deadline-chip">
                          마감: {format(new Date(a.deadline), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteAssignment(a._id)}>삭제</button>
                  </div>

                  {recs.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>아직 제출된 녹음이 없습니다</div>
                  ) : (
                    <>
                      <div className="divider" />
                      <div className="section-title">제출된 녹음 ({recs.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {recs.map(r => <RecordingCard key={r._id} recording={r} isAdmin={true} onReviewed={load} />)}
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
            <div className="empty-text">제출된 녹음이 없습니다</div>
          </div>
        ) : (
          <div className="card-grid">
            {recordings.map(r => <RecordingCard key={r._id} recording={r} isAdmin={true} onReviewed={load} />)}
          </div>
        )
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-16">
              <div className="modal-title" style={{ marginBottom: 0 }}>
                📋 과제 부여 — {profile.displayName}
              </div>
              <button className="close-btn" onClick={() => setAssignModal(false)}>×</button>
            </div>

            {assignForms.map((f, i) => (
              <div key={i} className="card" style={{ marginBottom: 12, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>과제 {i + 1}</div>
                  {assignForms.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeAssignForm(i)}>✕ 제거</button>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">과제명 *</label>
                  <input className="form-input" placeholder="예: 1화 1번 대사 녹음" value={f.title}
                    onChange={e => setAssignForms(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                </div>
                <div className="form-group">
                  <label className="form-label">내용 설명</label>
                  <textarea className="form-textarea" placeholder="녹음 관련 안내사항, 대본 등..." value={f.description}
                    onChange={e => setAssignForms(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">제출 마감일 *</label>
                  <input className="form-input" type="datetime-local" value={f.deadline}
                    onChange={e => setAssignForms(p => p.map((x, idx) => idx === i ? { ...x, deadline: e.target.value } : x))} />
                </div>
              </div>
            ))}

            <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 12 }} onClick={addAssignForm}>
              ➕ 과제 추가
            </button>

            {assignMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                background: assignMsg.startsWith('✅') ? 'rgba(66,217,140,0.1)' : 'rgba(255,68,102,0.1)',
                color: assignMsg.startsWith('✅') ? 'var(--approved)' : 'var(--overdue)',
                border: `1px solid ${assignMsg.startsWith('✅') ? 'rgba(66,217,140,0.3)' : 'rgba(255,68,102,0.3)'}`
              }}>{assignMsg}</div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAssignModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={submitAssignments} disabled={assigning}>
                {assigning ? '부여 중...' : `${assignForms.length}개 과제 부여`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

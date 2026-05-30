import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { API } from '../contexts/AuthContext';

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('members');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/users`);
      setUsers(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const createUser = async () => {
    if (!form.username || !form.password || !form.displayName) {
      setMsg('모든 항목을 입력하세요'); return;
    }
    setLoading(true); setMsg('');
    try {
      await axios.post(`${API}/api/auth/create-user`, form);
      setMsg('✅ 계정이 생성되었습니다');
      setForm({ username: '', password: '', displayName: '', role: 'member' });
      loadUsers();
      setTimeout(() => { setCreateModal(false); setMsg(''); }, 1200);
    } catch (err) {
      setMsg(err.response?.data?.message || '생성에 실패했습니다');
    } finally { setLoading(false); }
  };

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!window.confirm(`${newRole === 'admin' ? '관리자 권한을 부여' : '관리자 권한을 해제'}하시겠습니까?`)) return;
    try {
      await axios.put(`${API}/api/users/${userId}/role`, { role: newRole });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || '변경에 실패했습니다');
    }
  };

  const deleteUser = async (userId, name) => {
    if (!window.confirm(`"${name}" 계정을 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API}/api/users/${userId}`);
      loadUsers();
    } catch {}
  };

  const members = users.filter(u => u.role === 'member');
  const admins = users.filter(u => u.role === 'admin');
  const shown = tab === 'members' ? members : admins;

  return (
    <Layout
      title="관리자 패널"
      subtitle="멤버 관리 및 과제 부여"
      headerActions={
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
          ➕ 계정 생성
        </button>
      }
    >
      <div className="tabs">
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          👤 일반 멤버 ({members.length})
        </button>
        <button className={`tab ${tab === 'admins' ? 'active' : ''}`} onClick={() => setTab('admins')}>
          👑 관리자 ({admins.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">멤버가 없습니다</div>
        </div>
      ) : (
        <div className="user-grid">
          {shown.map(u => (
            <div key={u._id} className="user-card">
              <div
                className="user-card-avatar"
                onClick={() => navigate(`/admin/user/${u._id}`)}
              >
                {u.displayName[0]}
              </div>
              <div
                className="user-card-name"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/admin/user/${u._id}`)}
              >
                {u.displayName}
              </div>
              <div className="user-card-username">@{u.username}</div>
              <span className={`user-role ${u.role}`} style={{ marginTop: 8, display: 'inline-block' }}>
                {u.role === 'admin' ? '관리자' : '멤버'}
              </span>
              <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/admin/user/${u._id}`)}
                >
                  📂 열람
                </button>
                <button
                  className={`btn btn-sm ${u.role === 'admin' ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => toggleRole(u._id, u.role)}
                >
                  {u.role === 'admin' ? '권한 해제' : '관리자로'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteUser(u._id, u.displayName)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create user modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-16">
              <div className="modal-title" style={{ marginBottom: 0 }}>➕ 계정 생성</div>
              <button className="close-btn" onClick={() => setCreateModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">표시 이름</label>
              <input className="form-input" placeholder="예: 홍길동" value={form.displayName}
                onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">아이디</label>
              <input className="form-input" placeholder="로그인 아이디" value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input className="form-input" type="password" placeholder="초기 비밀번호" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">권한</label>
              <select className="form-select" value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="member">일반 멤버</option>
                <option value="admin">관리자</option>
              </select>
            </div>

            {msg && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                background: msg.startsWith('✅') ? 'rgba(66,217,140,0.1)' : 'rgba(255,68,102,0.1)',
                color: msg.startsWith('✅') ? 'var(--approved)' : 'var(--overdue)',
                border: `1px solid ${msg.startsWith('✅') ? 'rgba(66,217,140,0.3)' : 'rgba(255,68,102,0.3)'}`
              }}>{msg}</div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCreateModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={createUser} disabled={loading}>
                {loading ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Layout({ children, title, subtitle, headerActions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifs = useCallback(async () => {
    try {
      const [nr, nc] = await Promise.all([
        axios.get(`${API}/api/notifications`),
        axios.get(`${API}/api/notifications/unread-count`)
      ]);
      setNotifications(nr.data);
      setUnread(nc.data.count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const markRead = async (id) => {
    await axios.put(`${API}/api/notifications/${id}/read`);
    fetchNotifs();
  };

  const markAllRead = async () => {
    await axios.put(`${API}/api/notifications/read-all`);
    fetchNotifs();
  };

  const navItems = [
    { icon: '🏠', label: '대시보드', path: '/dashboard' },
    ...(user?.role === 'admin' ? [{ icon: '👥', label: '관리자 패널', path: '/admin' }] : [])
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🎙️ DUBBING</h1>
          <p>음성 관리 플랫폼</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button
            className={`nav-item ${notifOpen ? 'active' : ''}`}
            onClick={() => setNotifOpen(o => !o)}
            style={{ position: 'relative' }}
          >
            <span className="nav-icon">🔔</span>
            알림
            {unread > 0 && (
              <span className="notif-badge" style={{ marginLeft: 'auto' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">{user?.displayName?.[0]}</div>
            <div>
              <div className="user-name">{user?.displayName}</div>
              <span className={`user-role ${user?.role}`}>
                {user?.role === 'admin' ? '관리자' : '멤버'}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>로그아웃</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-top">
            <div>
              <div className="page-title">{title}</div>
              {subtitle && <div className="page-subtitle">{subtitle}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {headerActions}
            </div>
          </div>
        </div>
        <div className="page-body">{children}</div>
      </main>

      {/* Notification panel */}
      {notifOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setNotifOpen(false)} />
      )}
      <div className={`notif-panel ${notifOpen ? 'open' : ''}`}>
        <div className="notif-header">
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            🔔 알림 {unread > 0 && <span style={{ color: 'var(--accent)', fontSize: 13 }}>({unread})</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>전체 읽음</button>
            )}
            <button className="close-btn" onClick={() => setNotifOpen(false)}>×</button>
          </div>
        </div>
        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔕</div>
              <div className="empty-text">알림이 없습니다</div>
            </div>
          ) : notifications.map(n => (
            <div
              key={n._id}
              className={`notif-item ${!n.isRead ? 'unread' : ''} ${n.type}`}
              onClick={() => markRead(n._id)}
            >
              <div className="notif-msg">{n.message}</div>
              <div className="notif-time">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ko })}
                {!n.isRead && <span style={{ marginLeft: 6, color: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>NEW</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../contexts/AuthContext';

export default function AudioPlayer({ recording }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);

  const token = localStorage.getItem('token');

  // 컴포넌트 마운트 시 Blob URL 미리 로드
  useEffect(() => {
    let url = null;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/recordings/stream/${recording._id}`, {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` }
        });
        url = URL.createObjectURL(res.data);
        setBlobUrl(url);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      if (url) URL.revokeObjectURL(url);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [recording._id, token]);

  const toggle = () => {
    if (!audioRef.current || !blobUrl) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    try {
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = recording.originalName;
        a.click();
      } else {
        const res = await axios.get(`${API}/api/recordings/download/${recording._id}`, {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` }
        });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url; a.download = recording.originalName;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('다운로드에 실패했습니다');
    }
  };

  return (
    <div>
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          onTimeUpdate={() => {
            const a = audioRef.current;
            if (!a) return;
            setCurrent(a.currentTime);
            setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
          }}
          onLoadedMetadata={() => setDuration(audioRef.current.duration)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
        />
      )}
      <div className="audio-player">
        <button
          className="play-btn"
          onClick={toggle}
          disabled={loading || error || !blobUrl}
          title={error ? '재생 불가' : loading ? '로딩 중...' : ''}
        >
          {loading ? '⏳' : error ? '✕' : playing ? '⏸' : '▶'}
        </button>
        <div className="audio-progress-wrap">
          <input
            className="audio-progress"
            type="range" min={0} max={100}
            value={progress}
            disabled={!blobUrl}
            onChange={e => {
              if (!audioRef.current) return;
              const t = (e.target.value / 100) * duration;
              audioRef.current.currentTime = t;
              setProgress(e.target.value);
            }}
          />
          <div className="audio-time">
            {loading ? '로딩 중...' : error ? '재생 오류' : `${fmt(currentTime)} / ${fmt(duration)}`}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleDownload}
          title="다운로드"
        >⬇</button>
      </div>
    </div>
  );
}

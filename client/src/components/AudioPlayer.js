import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../contexts/AuthContext';

export default function AudioPlayer({ recording }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const audioRef = useRef(null);

  const token = localStorage.getItem('token');
  const src = `${API}/api/recordings/stream/${recording._id}`;

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
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
      const res = await axios.get(`${API}/api/recordings/download/${recording._id}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = recording.originalName;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      alert('다운로드에 실패했습니다');
    }
  };

  return (
    <div>
      <audio
        ref={audioRef}
        src={src}
        headers={{ Authorization: `Bearer ${token}` }}
        onTimeUpdate={() => {
          const a = audioRef.current;
          setCurrent(a.currentTime);
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
      />
      <div className="audio-player">
        <button className="play-btn" onClick={toggle}>
          {playing ? '⏸' : '▶'}
        </button>
        <div className="audio-progress-wrap">
          <input
            className="audio-progress"
            type="range" min={0} max={100}
            value={progress}
            onChange={e => {
              if (!audioRef.current) return;
              const t = (e.target.value / 100) * duration;
              audioRef.current.currentTime = t;
              setProgress(e.target.value);
            }}
          />
          <div className="audio-time">{fmt(currentTime)} / {fmt(duration)}</div>
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

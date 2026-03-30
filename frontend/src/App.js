import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Upload, FileVideo, FileAudio, Clock, CheckCircle,
  AlertCircle, Trash2, ChevronDown, ChevronUp, Loader,
  Zap, History, BarChart2, Copy, Download
} from 'lucide-react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = {
  size: (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`,
  duration: (s) => s ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : '—',
  date: (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
};

const STATUS_META = {
  processing: { label: 'Processing…', color: 'var(--yellow)', icon: <Loader size={14} className="spin" /> },
  done:       { label: 'Done',        color: 'var(--green)',  icon: <CheckCircle size={14} /> },
  error:      { label: 'Error',       color: 'var(--red)',    icon: <AlertCircle size={14} /> },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="stat-card" style={{ borderColor: accent }}>
      <div className="stat-icon" style={{ color: accent }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function SummaryCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const meta = STATUS_META[item.status] || STATUS_META.processing;

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const downloadTxt = () => {
    const content = `SnapSummary Export\n${'='.repeat(40)}\nFile: ${item.original_filename}\nDate: ${fmt.date(item.created_at)}\n\n${item.summary}\n\n${'='.repeat(40)}\nFULL TRANSCRIPT\n${'='.repeat(40)}\n${item.transcript}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.original_filename}_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`summary-card ${item.status}`}>
      <div className="summary-card-header" onClick={() => item.status === 'done' && setExpanded(!expanded)}>
        <div className="summary-card-left">
          <div className="file-icon">
            {item.file_type === 'video' ? <FileVideo size={20} /> : <FileAudio size={20} />}
          </div>
          <div className="summary-card-info">
            <div className="summary-filename">{item.original_filename}</div>
            <div className="summary-meta">
              <span>{fmt.size(item.file_size)}</span>
              {item.duration_seconds && <span>{fmt.duration(item.duration_seconds)}</span>}
              {item.language && <span className="lang-badge">{item.language.toUpperCase()}</span>}
              <span>{fmt.date(item.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="summary-card-right">
          <span className="status-badge" style={{ color: meta.color, borderColor: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          {item.status === 'done' && (
            <span className="expand-btn">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          )}
          <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {item.status === 'error' && (
        <div className="error-msg">⚠ {item.error_message || 'Processing failed. Check your OpenAI API key.'}</div>
      )}

      {item.status === 'done' && expanded && (
        <div className="summary-card-body">
          <div className="result-actions">
            <button className="action-btn" onClick={() => copyText(item.summary, 'Summary')}>
              <Copy size={13} /> Copy Summary
            </button>
            <button className="action-btn" onClick={downloadTxt}>
              <Download size={13} /> Download .txt
            </button>
            <button className="action-btn secondary" onClick={() => setShowTranscript(!showTranscript)}>
              {showTranscript ? 'Hide' : 'Show'} Transcript
            </button>
          </div>

          <div className="summary-text">
            {item.summary.split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('##') ? 'summary-heading' : line.startsWith('•') ? 'summary-bullet' : ''}>
                {line.replace('## ', '')}
              </p>
            ))}
          </div>

          {showTranscript && (
            <div className="transcript-box">
              <div className="transcript-label">
                Full Transcript
                <button className="action-btn small" onClick={() => copyText(item.transcript, 'Transcript')}>
                  <Copy size={11} /> Copy
                </button>
              </div>
              <p className="transcript-text">{item.transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('upload'); // upload | history
  const [uploading, setUploading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, done: 0, processing: 0, errors: 0 });
  const pollRef = useRef(null);

  // Load history + stats on mount
  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  // Poll if there's a processing item
  useEffect(() => {
    if (currentItem?.status === 'processing') {
      pollRef.current = setInterval(() => pollStatus(currentItem.id), 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [currentItem]);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/api/history/`);
      setHistory(data.results);
    } catch {
      // silently fail
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/api/stats/`);
      setStats(data);
    } catch {
      // silently fail
    }
  };

  const pollStatus = async (id) => {
    try {
      const { data } = await axios.get(`${API}/api/summaries/${id}/`);
      if (data.status !== 'processing') {
        clearInterval(pollRef.current);
        setCurrentItem(data);
        fetchHistory();
        fetchStats();
        if (data.status === 'done') toast.success('Summary ready!');
        else toast.error('Processing failed.');
      }
    } catch {
      clearInterval(pollRef.current);
    }
  };

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return;
    const file = accepted[0];

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large! Max 50MB.');
      return;
    }

    setUploading(true);
    setCurrentItem(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`${API}/api/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCurrentItem(data);
      toast.success('Uploaded! Transcribing now…');
      fetchStats();
    } catch (err) {
      const msg = err.response?.data?.file?.[0] || 'Upload failed. Try again.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [], 'audio/*': [] },
    maxFiles: 1,
    disabled: uploading,
  });

  const deleteItem = async (id) => {
    try {
      await axios.delete(`${API}/api/summaries/${id}/`);
      setHistory(h => h.filter(i => i.id !== id));
      if (currentItem?.id === id) setCurrentItem(null);
      fetchStats();
      toast.success('Deleted.');
    } catch {
      toast.error('Could not delete.');
    }
  };

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <Zap size={22} className="logo-icon" />
            <span className="logo-text">Snap<span className="logo-accent">Summary</span></span>
          </div>
          <nav className="nav">
            <button className={`nav-btn ${view === 'upload' ? 'active' : ''}`} onClick={() => setView('upload')}>
              <Upload size={15} /> Upload
            </button>
            <button className={`nav-btn ${view === 'history' ? 'active' : ''}`} onClick={() => { setView('history'); fetchHistory(); fetchStats(); }}>
              <History size={15} /> History
            </button>
          </nav>
        </div>
      </header>

      <main className="main">

        {/* ── Stats Bar ── */}
        <div className="stats-row">
          <StatCard icon={<BarChart2 size={18} />} label="Total" value={stats.total} accent="var(--accent)" />
          <StatCard icon={<CheckCircle size={18} />} label="Done" value={stats.done} accent="var(--green)" />
          <StatCard icon={<Loader size={18} />} label="Processing" value={stats.processing} accent="var(--yellow)" />
          <StatCard icon={<AlertCircle size={18} />} label="Errors" value={stats.errors} accent="var(--red)" />
        </div>

        {/* ── Upload View ── */}
        {view === 'upload' && (
          <div className="upload-view">
            <div className="upload-hero">
              <h1 className="hero-title">Drop your file.<br /><span className="hero-accent">Get the gist.</span></h1>
              <p className="hero-sub">Upload any video or audio up to 50MB — Whisper transcribes it, GPT-4 summarizes it.</p>
            </div>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-over' : ''} ${uploading ? 'disabled' : ''}`}>
              <input {...getInputProps()} />
              <div className="dropzone-inner">
                {uploading ? (
                  <>
                    <Loader size={40} className="spin drop-icon" />
                    <p className="drop-title">Uploading…</p>
                  </>
                ) : isDragActive ? (
                  <>
                    <Upload size={40} className="drop-icon active" />
                    <p className="drop-title">Drop it!</p>
                  </>
                ) : (
                  <>
                    <div className="drop-icons-row">
                      <FileVideo size={32} className="drop-icon" />
                      <FileAudio size={32} className="drop-icon" />
                    </div>
                    <p className="drop-title">Drag & drop or <span className="drop-link">click to browse</span></p>
                    <p className="drop-hint">MP4, MOV, AVI, MP3, WAV, OGG — max 50MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Current processing item */}
            {currentItem && (
              <div className="current-result">
                <h3 className="section-title">Current File</h3>
                <SummaryCard item={currentItem} onDelete={deleteItem} />
              </div>
            )}
          </div>
        )}

        {/* ── History View ── */}
        {view === 'history' && (
          <div className="history-view">
            <h2 className="section-title">All Summaries <span className="count-badge">{history.length}</span></h2>
            {history.length === 0 ? (
              <div className="empty-state">
                <Clock size={48} className="empty-icon" />
                <p>No summaries yet. Upload a file to get started.</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map(item => (
                  <SummaryCard key={item.id} item={item} onDelete={deleteItem} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

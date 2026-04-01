import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FileVideo, FileAudio, FileText, CheckCircle, AlertCircle, Trash2,
  ChevronDown, ChevronUp, Loader, Zap, History, Copy, Download
} from 'lucide-react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
            {item.file_type === 'video' ? <FileVideo size={20} /> : item.file_type === 'document' ? <FileText size={20} /> : <FileAudio size={20} />}
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
        <div className="error-msg">⚠ {item.error_message || 'Processing failed. Check your API key.'}</div>
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

export default function App() {
  const [view, setView] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    if (currentItem?.status === 'processing') {
      pollRef.current = setInterval(() => pollStatus(currentItem.id), 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [currentItem]);

  const fetchHistory = async () => {
    try { const { data } = await axios.get(`${API}/api/history/`); setHistory(data.results); } catch {}
  };

  const pollStatus = async (id) => {
    try {
      const { data } = await axios.get(`${API}/api/summaries/${id}/`);
      if (data.status !== 'processing') {
        clearInterval(pollRef.current);
        setCurrentItem(data);
        fetchHistory();
        if (data.status === 'done') toast.success('Summary ready!');
        else toast.error('Processing failed.');
      }
    } catch { clearInterval(pollRef.current); }
  };

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return;
    const file = accepted[0];
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large! Max 50MB.'); return; }
    setUploading(true); setCurrentItem(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post(`${API}/api/upload/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCurrentItem(data);
      toast.success('Uploaded! Transcribing now…');
    } catch (err) {
      toast.error(err.response?.data?.file?.[0] || 'Upload failed. Try again.');
    } finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'video/*': [], 'audio/*': [], 'application/pdf': [], 'text/plain': [] }, maxFiles: 1, disabled: uploading,
  });

  const deleteItem = async (id) => {
    try {
      await axios.delete(`${API}/api/summaries/${id}/`);
      setHistory(h => h.filter(i => i.id !== id));
      if (currentItem?.id === id) setCurrentItem(null);
      toast.success('Deleted.');
    } catch { toast.error('Could not delete.'); }
  };

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <Zap size={20} className="logo-icon" />
            <span className="logo-text">Snap<span className="logo-accent">Summary</span></span>
          </div>
          <nav className="nav">
            <button className={`nav-btn ${view === 'upload' ? 'active' : ''}`} onClick={() => setView('upload')}>Upload</button>
            <button className={`nav-btn ${view === 'history' ? 'active' : ''}`} onClick={() => { setView('history'); fetchHistory(); }}>
              <History size={14} /> History
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {view === 'upload' && (
          <div className="upload-view">
            <div className="upload-hero">
              <h1 className="hero-title">Drop your file.<br /><span className="hero-accent">Get the gist.</span></h1>
            </div>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-over' : ''} ${uploading ? 'disabled' : ''}`}>
              <input {...getInputProps()} />
              <div className="dropzone-inner">
                {uploading ? (
                  <><Loader size={36} className="spin drop-icon" /><p className="drop-title">Uploading…</p></>
                ) : isDragActive ? (
                  <p className="drop-title">Drop it!</p>
                ) : (
                  <><p className="drop-title">Upload any audio or video</p><p className="drop-hint">Video, Audio, PDF, TXT — max 50MB</p></>
                )}
              </div>
            </div>
            {currentItem && (
              <div className="current-result">
                <h3 className="section-title">Current File</h3>
                <SummaryCard item={currentItem} onDelete={deleteItem} />
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="history-view">
            <h2 className="section-title">All Summaries <span className="count-badge">{history.length}</span></h2>
            {history.length === 0 ? (
              <div className="empty-state"><p>No summaries yet. Upload a file to get started.</p></div>
            ) : (
              <div className="history-list">
                {history.map(item => <SummaryCard key={item.id} item={item} onDelete={deleteItem} />)}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

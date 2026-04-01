import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FileVideo, FileAudio, FileText, CheckCircle, AlertCircle, Trash2,
  ChevronDown, ChevronUp, Loader, Zap, History, Copy, Download,
  Send, X
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

// ── Aira Avatar SVG ──────────────────────────────────────────────
function AiraAvatar({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="22" fill="url(#aira-bg)"/>
      {/* Hair */}
      <ellipse cx="22" cy="14" rx="10" ry="11" fill="#2D1B6E"/>
      <ellipse cx="13" cy="19" rx="3.5" ry="6" fill="#2D1B6E"/>
      <ellipse cx="31" cy="19" rx="3.5" ry="6" fill="#2D1B6E"/>
      {/* Face */}
      <ellipse cx="22" cy="22" rx="8.5" ry="9" fill="#FDDBB4"/>
      {/* Eyes */}
      <ellipse cx="18.5" cy="21" rx="1.5" ry="1.8" fill="#2D1B6E"/>
      <ellipse cx="25.5" cy="21" rx="1.5" ry="1.8" fill="#2D1B6E"/>
      <circle cx="19" cy="20.5" r="0.5" fill="white"/>
      <circle cx="26" cy="20.5" r="0.5" fill="white"/>
      {/* Smile */}
      <path d="M18.5 25.5 Q22 28 25.5 25.5" stroke="#C97B4B" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="16" cy="24" rx="2" ry="1" fill="#F4A0A0" opacity="0.5"/>
      <ellipse cx="28" cy="24" rx="2" ry="1" fill="#F4A0A0" opacity="0.5"/>
      {/* Shoulders */}
      <path d="M10 44 Q12 36 22 34 Q32 36 34 44" fill="#7C6DFA"/>
      <defs>
        <radialGradient id="aira-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#A594FB"/>
          <stop offset="100%" stopColor="#5B4FD4"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

// ── Floating Aira Button ─────────────────────────────────────────
function AiraFloatingBtn({ visible, onClick, chatOpen }) {
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    if (visible && !chatOpen) {
      const t = setTimeout(() => setBubbleVisible(true), 800);
      return () => clearTimeout(t);
    } else {
      setBubbleVisible(false);
    }
  }, [visible, chatOpen]);

  if (!visible || chatOpen) return null;

  return (
    <div className="aira-float-wrap">
      {bubbleVisible && (
        <div className="aira-bubble">
          Chat with <strong>Aira</strong> about your file ✨
        </div>
      )}
      <button className="aira-float-btn" onClick={onClick} title="Chat with Aira">
        <div className="aira-pulse" />
        <AiraAvatar size={52} />
      </button>
    </div>
  );
}

// ── Aira Chat Panel ──────────────────────────────────────────────
function AiraChatPanel({ item, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi! I'm Aira 👋 I've read "${item.original_filename}". What would you like to know about it?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/summaries/${item.id}/chat/`, { question: q });
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I ran into an issue. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="aira-panel">
      {/* Panel Header */}
      <div className="aira-panel-header">
        <div className="aira-panel-identity">
          <AiraAvatar size={40} />
          <div>
            <div className="aira-name">Aira</div>
            <div className="aira-status"><span className="aira-dot" />AI Assistant</div>
          </div>
        </div>
        <button className="aira-close" onClick={onClose}><X size={18} /></button>
      </div>

      {/* File pill */}
      <div className="aira-file-pill">
        <FileText size={12} />
        {item.original_filename}
      </div>

      {/* Messages */}
      <div className="aira-messages">
        {messages.map((m, i) => (
          <div key={i} className={`aira-msg ${m.role}`}>
            {m.role === 'assistant' && (
              <div className="aira-msg-avatar"><AiraAvatar size={28} /></div>
            )}
            <div className="aira-msg-bubble">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="aira-msg assistant">
            <div className="aira-msg-avatar"><AiraAvatar size={28} /></div>
            <div className="aira-msg-bubble aira-typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="aira-input-row">
        <input
          className="aira-input"
          placeholder="Ask Aira anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button className="aira-send" onClick={sendMessage} disabled={loading || !input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────
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

  const FileIcon = item.file_type === 'video' ? FileVideo : item.file_type === 'document' ? FileText : FileAudio;

  return (
    <div className={`summary-card ${item.status}`}>
      <div className="summary-card-header" onClick={() => item.status === 'done' && setExpanded(!expanded)}>
        <div className="summary-card-left">
          <div className="file-icon"><FileIcon size={20} /></div>
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

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatItem, setChatItem] = useState(null);
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
        if (data.status === 'done') {
          toast.success('Summary ready!');
          setChatItem(data);
        } else {
          toast.error('Processing failed.');
        }
      }
    } catch { clearInterval(pollRef.current); }
  };

  const openChat = () => {
    if (chatItem) { setChatOpen(true); }
  };

  const closeChat = () => setChatOpen(false);

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return;
    const file = accepted[0];
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large! Max 50MB.'); return; }
    setUploading(true); setCurrentItem(null); setChatOpen(false); setChatItem(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post(`${API}/api/upload/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCurrentItem(data);
      toast.success('Uploaded! Processing now…');
    } catch (err) {
      toast.error(err.response?.data?.file?.[0] || 'Upload failed. Try again.');
    } finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [], 'audio/*': [], 'application/pdf': [], 'text/plain': [] },
    maxFiles: 1,
    disabled: uploading,
  });

  const deleteItem = async (id) => {
    try {
      await axios.delete(`${API}/api/summaries/${id}/`);
      setHistory(h => h.filter(i => i.id !== id));
      if (currentItem?.id === id) { setCurrentItem(null); setChatItem(null); setChatOpen(false); }
      toast.success('Deleted.');
    } catch { toast.error('Could not delete.'); }
  };

  const airaVisible = !!chatItem && chatItem.status === 'done';

  return (
    <div className={`app-shell ${chatOpen ? 'chat-open' : ''}`}>
      <Toaster position="top-center" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />

      {/* ── Main Content ── */}
      <div className="main-content">
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
                    <><p className="drop-title">Upload any audio, video, PDF or text file</p><p className="drop-hint">MP4, MOV, AVI, MP3, WAV, OGG, PDF, TXT — max 50MB</p></>
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
                  {history.map(item => (
                    <SummaryCard key={item.id} item={item} onDelete={deleteItem} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Aira Chat Panel (right side) ── */}
      {chatOpen && chatItem && (
        <AiraChatPanel item={chatItem} onClose={closeChat} />
      )}

      {/* ── Floating Aira Button ── */}
      <AiraFloatingBtn visible={airaVisible} onClick={openChat} chatOpen={chatOpen} />
    </div>
  );
}

// // Missing import fix
// function History(props) {
//   return (
//     <svg xmlns="http://www.w3.org/2000/svg" width={props.size||16} height={props.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
//     </svg>
//   );
// }

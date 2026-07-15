import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
  FileVideo, FileAudio, FileText, CheckCircle, AlertCircle, Trash2,
  ChevronDown, ChevronUp, Loader, Zap, History, Copy, Download,
  Send, X
} from 'lucide-react';
import './App.css';
import { WovenLightHero } from './components/ui/woven-light-hero';
import { TiltCard } from './components/ui/be-ui-tilt-card';
import { InteractiveRobotSpline } from './components/ui/interactive-3d-robot';

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


// ── Aira Chat Panel ──────────────────────────────────────────────
function AiraChatPanel({ item, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi! I'm Aira 👋 I've read "${item?.original_filename || 'your files'}". What would you like to know about it?` }
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
    
    if (!item) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', text: "Please upload a file to continue chat" }]);
      }, 500);
      return;
    }

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
    <div className="aira-panel bg-gradient-to-br from-slate-300/10 via-slate-500/5 to-slate-900/40 backdrop-blur-xl border border-slate-300/30 shadow-[0_0_40px_rgba(203,213,225,0.15)]">
      <div className="aira-panel-header">
        <div className="aira-panel-identity">
          <img src="/blue-sphere.gif" alt="AI Avatar" width={36} height={36} className="rounded-full object-cover mix-blend-screen" />
          <div>
            <div className="aira-name">Aira</div>
            <div className="aira-status"><span className="aira-dot" /> Online</div>
          </div>
        </div>
        <button onClick={onClose} className="aira-close"><X size={20} /></button>
      </div>

      {/* File pill */}
      <div className="aira-file-pill">
        <FileText size={12} />
        {item?.original_filename || 'No file selected'}
      </div>

      {/* Messages */}
      <div className="aira-messages">
        {messages.map((m, i) => (
          <div key={i} className={`aira-msg ${m.role}`}>
            {m.role === 'assistant' && <div className="aira-msg-avatar"><img src="/blue-sphere.gif" alt="AI" width={28} height={28} className="rounded-full object-cover mix-blend-screen" /></div>}
            <div className="aira-msg-bubble">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="aira-msg assistant">
            <div className="aira-msg-avatar"><img src="/blue-sphere.gif" alt="AI" width={28} height={28} className="rounded-full object-cover mix-blend-screen" /></div>
            <div className="aira-msg-bubble aira-typing">
              <span /><span /><span />
            </div>
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

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`SnapSummary Export`, 10, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`File: ${item.original_filename}`, 10, 30);
    doc.text(`Date: ${fmt.date(item.created_at)}`, 10, 36);
    
    doc.setFontSize(12);
    const splitSummary = doc.splitTextToSize(item.summary, 190);
    doc.text(splitSummary, 10, 50);

    doc.save(`${item.original_filename}_summary.pdf`);
    toast.success('PDF downloaded!');
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
            <button className="action-btn secondary" onClick={downloadPdf}>
              <Download size={13} /> Download PDF
            </button>
          </div>

          <div className="summary-text">
            {item.summary.split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('##') ? 'summary-heading' : line.startsWith('•') ? 'summary-bullet' : ''}>
                {line.replace('## ', '')}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState(() => window.location.hash.replace('#', '') === 'history' ? 'history' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatItem, setChatItem] = useState(null);
  const pollRef = useRef(null);
  const cardsRef = useRef(null);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolledDown(window.scrollY > window.innerHeight * 0.4);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.history.replaceState({ view }, '', window.location.pathname + (view === 'history' ? '#history' : ''));

    const handlePopState = (e) => {
      if (e.state && e.state.view) {
        setView(e.state.view);
      } else {
        const hashView = window.location.hash.replace('#', '');
        setView(hashView === 'history' ? 'history' : 'upload');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView) => {
    setView(newView);
    if (newView === 'history') {
      window.history.pushState({ view: newView }, '', window.location.pathname + '#history');
    } else {
      window.history.pushState({ view: newView }, '', window.location.pathname);
    }
  };

  useEffect(() => {
    if (!cardsRef.current || cardsVisible) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setCardsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(cardsRef.current);
    return () => observer.disconnect();
  }, [cardsVisible, view]);

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

  const toggleChat = () => setChatOpen(prev => !prev);
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
    <>
      {view === 'upload' && <WovenLightHero />}
      <div id="workspace" className={`app-shell relative ${chatOpen ? 'chat-open' : ''}`}>
        <Toaster position="top-center" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />

        {/* ── Main Content ── */}
        <div className="main-content flex items-center justify-center min-h-screen pb-40">
          <main className="w-full max-w-4xl mx-auto px-4 lg:px-8 z-10 relative">
            {view === 'upload' && (
              <>
                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch min-h-[260px]">
                  {/* Left Column: Upload */}
                  <TiltCard className={`flex flex-col w-full h-full rounded-3xl bg-gradient-to-br from-slate-300/10 via-slate-500/5 to-slate-900/40 backdrop-blur-xl border border-slate-300/30 shadow-[0_0_40px_rgba(203,213,225,0.15)] hover:shadow-[0_0_60px_rgba(203,213,225,0.25)] transition-shadow duration-500 ${cardsVisible ? 'animate-fall' : 'opacity-0'}`}>
                    <div {...getRootProps()} className={`flex-1 ${isDragActive ? 'bg-white/5' : ''} ${uploading ? 'opacity-50 pointer-events-none' : ''} rounded-3xl flex flex-col items-center justify-center p-6 transition-colors cursor-pointer w-full h-full`}>
                      <input {...getInputProps()} />
                      <div className="text-center w-full">
                        {uploading ? (
                          <><Loader size={36} className="spin mx-auto mb-4 text-slate-300" /><p className="text-white font-medium">Uploading…</p></>
                        ) : isDragActive ? (
                          <p className="text-white font-medium">Drop it!</p>
                        ) : (
                          <><p className="text-white font-medium text-base">Upload any audio, video, PDF or text file</p><p className="text-slate-400 mt-2 text-sm">MP4, MOV, AVI, MP3, WAV, OGG, PDF, TXT — max 50MB</p></>
                        )}
                      </div>
                    </div>
                  </TiltCard>

                  {/* Right Column: History Link */}
                  <TiltCard className={`flex flex-col w-full h-full rounded-3xl bg-gradient-to-br from-slate-300/10 via-slate-500/5 to-slate-900/40 backdrop-blur-xl border border-slate-300/30 shadow-[0_0_40px_rgba(203,213,225,0.15)] hover:shadow-[0_0_60px_rgba(203,213,225,0.25)] transition-shadow duration-500 ${cardsVisible ? 'animate-fall-delayed' : 'opacity-0'}`}>
                    <div onClick={() => { navigateTo('history'); fetchHistory(); }} className="flex-1 rounded-3xl flex flex-col items-center justify-center p-6 transition-colors cursor-pointer w-full h-full hover:bg-white/5 relative z-10 pointer-events-auto">
                      <History size={42} className="text-slate-300 mb-4 opacity-80" />
                      <h2 className="text-white font-medium text-xl mb-2 flex items-center gap-3">
                        View History
                      </h2>
                      <p className="text-slate-400 text-sm text-center">Browse all your previously processed files</p>
                    </div>
                  </TiltCard>
                </div>

                {currentItem && (
                  <div className="mt-8 w-full mx-auto rounded-3xl bg-gradient-to-br from-slate-300/10 via-slate-500/5 to-slate-900/40 backdrop-blur-xl border border-slate-300/30 shadow-[0_0_40px_rgba(203,213,225,0.15)] p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Current File</h3>
                    <SummaryCard item={currentItem} onDelete={deleteItem} />
                  </div>
                )}
              </>
            )}

            {view === 'history' && (
              <div className="w-full max-w-5xl mx-auto">
                <div className="flex flex-col mb-8">
                  <button onClick={() => navigateTo('upload')} className="text-slate-400 hover:text-white mb-4 flex items-center gap-2 transition-colors text-sm font-medium w-fit">
                    ← Back to Upload
                  </button>
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    History <span className="count-badge bg-white/10 text-white px-3 py-1 rounded-full text-lg font-normal">{history.length}</span>
                  </h2>
                </div>

                <div className="flex flex-col gap-4 w-full">
                  {history.length === 0 ? (
                    <div className="flex items-center justify-center text-slate-400 py-16 rounded-3xl border border-white/10 bg-white/5">
                      <p>No files processed yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {history.map(item => (
                        <div key={item.id} className="flex flex-col w-full rounded-2xl bg-gradient-to-br from-slate-300/10 via-slate-500/5 to-slate-900/40 backdrop-blur-xl border border-slate-300/30 shadow-[0_0_30px_rgba(203,213,225,0.1)] hover:shadow-[0_0_40px_rgba(203,213,225,0.2)] transition-shadow duration-500 p-2">
                          <SummaryCard item={item} onDelete={deleteItem} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ── Interactive Robot ── */}
        <div 
          onClick={toggleChat}
          className={`group absolute bottom-0 right-0 w-[350px] h-[350px] overflow-visible pointer-events-auto z-[200] transition-all duration-300 ease-out transform scale-[0.6] origin-bottom-right cursor-pointer ${scrolledDown && view === 'upload' && !chatOpen ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}
        >
          {/* Hover Tooltip (Cartoon Speech Bubble) */}
          <div className={`absolute -top-8 left-[45%] -translate-x-1/2 pointer-events-none z-[60] transition-all duration-200 ease-out origin-bottom animate-float-slow ${chatOpen ? 'opacity-0 scale-90' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}>
            <div className="bg-white text-[#1a1a1a] px-7 py-3.5 rounded-[24px] shadow-[0_4px_14px_rgba(0,0,0,0.25)] font-semibold text-[17px] whitespace-nowrap relative">
              Chat with Aira
              {/* Tail Bubbles */}
              <div className="absolute -bottom-4 left-[45%] w-[14px] h-[14px] bg-white rounded-full shadow-sm" />
              <div className="absolute -bottom-8 left-[40%] w-[8px] h-[8px] bg-white rounded-full shadow-sm" />
            </div>
          </div>

          {/* Cropping Mask */}
          <div className="absolute inset-0 overflow-hidden rounded-bl-3xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[450px] h-[450px] drop-shadow-2xl">
              <InteractiveRobotSpline
                scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
                className="w-full h-full pointer-events-none"
              />
            </div>
          </div>
          {/* Click Catcher Overlay */}
          <div className="absolute inset-0 z-10" />
        </div>
      </div>

      {/* ── Chat Panel ── */}
      {chatOpen && <AiraChatPanel item={chatItem} onClose={closeChat} />}
    </>
  );
}

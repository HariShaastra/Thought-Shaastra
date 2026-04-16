import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Clock, 
  BookOpen, 
  Hash, 
  Settings, 
  Search, 
  Calendar, 
  Share2, 
  Network, 
  Target, 
  Lock, 
  Unlock,
  ChevronRight,
  History,
  BarChart3,
  Download,
  Moon,
  Sun,
  MoreVertical,
  Link as LinkIcon,
  Edit3,
  Mic,
  Square,
  Play,
  HelpCircle,
  Flower2,
  Trash2,
  X,
  LogOut,
  User as UserIcon,
  Check,
  Info,
  ArrowRight,
  Shield,
  Cloud,
  Smartphone,
  Menu,
  Feather,
  Quote,
  Sunrise,
  FileText,
  Image as ImageIcon,
  Video,
  Paperclip,
  Bell,
  UserPlus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import { cn, formatDate, formatTime } from './lib/utils';
import { Thought, Category, Purpose, CategoryStat, Connection, Question, User, Document, DocumentSection } from './types';

// --- Custom Hooks ---

const useVoiceRecorder = (showToast: (msg: string, type: 'success' | 'error' | 'info') => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support audio recording.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      
      let message = "Microphone access denied. Please enable it in your browser settings.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Microphone permission was denied. Please allow access in your browser's address bar or settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No microphone found. Please connect a microphone and try again.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = "Microphone is already in use by another application.";
      } else if (err.message?.includes('dismissed')) {
        message = "Microphone permission request was dismissed. Please click the microphone icon again and select 'Allow'.";
      }
      
      showToast(message, 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return { 
    isRecording, 
    audioBlob, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    resetRecording, 
    blobToBase64 
  };
};

// --- Components ---

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={cn(
      "fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
      type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" :
      type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
      "bg-accent/10 border-accent/20 text-accent"
    )}
  >
    {type === 'success' ? <CheckCircle2 size={20} /> : type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
    <span className="text-sm font-bold">{message}</span>
    <button onClick={onClose} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors">
      <X size={16} />
    </button>
  </motion.div>
);

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
  <Modal isOpen={isOpen} onClose={onCancel} title={title}>
    <div className="space-y-8 py-4">
      <p className="text-ink-muted text-lg leading-relaxed">{message}</p>
      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 bg-red-500 hover:bg-red-600 border-red-500" onClick={onConfirm}>Confirm</Button>
      </div>
    </div>
  </Modal>
);

const PromptDialog = ({ isOpen, title, message, placeholder, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, placeholder: string, onConfirm: (val: string) => void, onCancel: () => void }) => {
  const [value, setValue] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirm(value); setValue(''); }} className="space-y-8 py-4">
        <div className="space-y-4">
          <p className="text-ink-muted text-lg leading-relaxed">{message}</p>
          <Input 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            placeholder={placeholder} 
            autoFocus 
            required
          />
        </div>
        <div className="flex gap-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="flex-1">Continue</Button>
        </div>
      </form>
    </Modal>
  );
};

const Logo = () => (
  <div className="flex items-center gap-3 sm:gap-6">
    <div className="relative w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
      {/* Sacred Geometry Layers */}
      {[0, 60, 120].map((rotation, i) => (
        <motion.div 
          key={rotation}
          animate={{ 
            rotate: [rotation, rotation + 360],
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            rotate: { duration: 20 + i * 5, repeat: Infinity, ease: "linear" },
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute inset-0 border border-accent/40 rounded-[35%]"
        />
      ))}
      
      {/* Central Pulsing Core */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          boxShadow: [
            "0 0 0px rgba(196,155,102,0)",
            "0 0 25px rgba(196,155,102,0.4)",
            "0 0 0px rgba(196,155,102,0)"
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-5 h-5 sm:w-8 sm:h-8 bg-accent rounded-full flex items-center justify-center z-10"
      >
        <Feather size={12} className="text-bg sm:hidden" />
        <Feather size={18} className="text-bg hidden sm:block" />
      </motion.div>

      {/* Orbiting particle */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 z-20"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-accent rounded-full blur-[1px]" />
      </motion.div>
    </div>
    <div className="flex flex-col min-w-0">
      <motion.h1 
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="text-lg sm:text-2xl font-black tracking-tight leading-none text-accent whitespace-nowrap overflow-hidden text-ellipsis"
      >
        Thought Shaastra
      </motion.h1>
      <span className="text-[8px] sm:text-[11px] font-sans font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase text-ink-muted mt-1 sm:mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
        Treasure your Thoughts
      </span>
    </div>
  </div>
);

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' }) => {
  const variants = {
    primary: 'bg-accent text-[#0D0B0A] hover:bg-accent-hover shadow-lg shadow-accent/10',
    secondary: 'bg-surface text-ink hover:bg-surface-hover border border-border',
    outline: 'border border-border text-ink hover:bg-surface',
    ghost: 'text-ink-muted hover:text-ink hover:bg-surface',
    danger: 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      'w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all',
      className
    )}
    {...props}
  />
);

const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea 
    className={cn(
      'w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all min-h-[120px] resize-none',
      className
    )}
    {...props}
  />
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-surface border border-border rounded-2xl p-6 shadow-xl overflow-hidden break-words', className)} {...props}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0D0B0A]/80 backdrop-blur-md z-50"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover text-ink-muted hover:text-ink rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto bg-surface">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const VoicePlayer = ({ audioData }: { audioData: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioData);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="mt-6 p-4 bg-surface rounded-2xl flex items-center gap-6 border border-border">
      <button 
        onClick={togglePlay}
        className="w-12 h-12 rounded-full bg-accent text-bg flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
      >
        {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>
      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden border border-border">
        {isPlaying && <motion.div animate={{ width: ['0%', '100%'] }} transition={{ duration: 5, repeat: Infinity }} className="h-full bg-accent" />}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Voice Note</span>
    </div>
  );
};

const AttachmentList = ({ attachments, onRemove }: { attachments: any[]; onRemove?: (id: string) => void }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {attachments.map(att => (
        <div key={att.id} className="group relative flex items-center gap-3 p-3 bg-surface border border-border rounded-2xl hover:border-accent transition-all">
          <div className="text-accent">
            {att.type.includes('image') ? <ImageIcon size={16} /> : 
             att.type.includes('video') ? <Video size={16} /> : 
             att.type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
          </div>
          <div className="max-w-[150px] truncate text-[10px] font-bold text-ink-muted uppercase tracking-widest">
            {att.name}
          </div>
          {onRemove && (
            <button 
              onClick={() => onRemove(att.id)}
              className="p-1 text-red-500 hover:bg-red-500/10 rounded-full"
            >
              <X size={12} />
            </button>
          )}
          {!onRemove && att.type === 'link' && (
            <a href={att.data} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
          )}
          {!onRemove && att.type.includes('image') && (
            <button onClick={() => window.open(att.data)} className="absolute inset-0" />
          )}
        </div>
      ))}
    </div>
  );
};

const DOCUMENT_TEMPLATES = [
  { id: 'blank', name: 'Blank Document', icon: <BookOpen size={16} />, sections: [{ title: 'Introduction', content: '' }] },
  { id: 'essay', name: 'Essay', icon: <Edit3 size={16} />, sections: [{ title: 'Introduction', content: '' }, { title: 'Body', content: '' }, { title: 'Conclusion', content: '' }] },
  { id: 'research', name: 'Research Paper', icon: <Search size={16} />, sections: [{ title: 'Abstract', content: '' }, { title: 'Introduction', content: '' }, { title: 'Methodology', content: '' }, { title: 'Results', content: '' }, { title: 'Discussion', content: '' }] },
  { id: 'journal', name: 'Journal Entry', icon: <Clock size={16} />, sections: [{ title: 'Reflections', content: '' }, { title: 'Gratitude', content: '' }, { title: 'Goals', content: '' }] }
];

const ThoughtEditor = ({ 
  editingThought, 
  categories, 
  thoughts, 
  documents, 
  onSave, 
  isRecording, 
  startRecording, 
  stopRecording, 
  resetRecording, 
  audioBlob, 
  recordingTime, 
  blobToBase64,
  promptAction
}: any) => {
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (editingThought?.attachments) {
      try {
        setAttachments(JSON.parse(editingThought.attachments));
      } catch (e) {
        setAttachments([]);
      }
    } else {
      setAttachments([]);
    }
  }, [editingThought]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAttachments(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: file.type,
        data: base64,
        size: file.size
      }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      
      let audio_data = null;
      if (audioBlob) {
        audio_data = await blobToBase64(audioBlob);
      }

      onSave({
        ...data,
        type: audioBlob ? 'voice' : 'text',
        audio_data,
        attachments
      });
    }} className="space-y-6">
      <Input name="title" placeholder="Title (Optional)" defaultValue={editingThought?.title || ''} />
      <div className="relative group">
        <TextArea name="text" placeholder="What's on your mind?" required defaultValue={editingThought?.text || ''} className="min-h-[200px] pb-16" />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-surface border border-border rounded-xl text-ink-muted hover:text-accent hover:border-accent transition-all"
              title="Attach File"
            >
              <Paperclip size={18} />
            </button>
            <button 
              type="button"
              onClick={() => {
                promptAction('Add Link', 'Enter the URL for the link attachment:', 'https://...', (url) => {
                  setAttachments(prev => [...prev, {
                    id: Math.random().toString(36).substring(7),
                    name: url,
                    type: 'link',
                    data: url,
                    size: 0
                  }]);
                });
              }}
              className="p-2.5 bg-surface border border-border rounded-xl text-ink-muted hover:text-accent hover:border-accent transition-all"
              title="Add Link"
            >
              <LinkIcon size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            {isRecording ? (
              <button type="button" onClick={stopRecording} className="p-2.5 bg-red-500 text-white rounded-xl animate-pulse">
                <Square size={18} />
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="p-2.5 bg-surface text-accent rounded-xl hover:bg-border transition-colors border border-border">
                <Mic size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {audioBlob && (
        <div className="p-4 bg-accent/10 rounded-2xl flex items-center justify-between border border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-bold text-accent uppercase tracking-widest">Voice Note Recorded ({recordingTime}s)</span>
          </div>
          <button type="button" onClick={resetRecording} className="text-red-500 hover:text-red-600 p-2">
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Attachments</label>
          <AttachmentList attachments={attachments} onRemove={(id) => setAttachments(prev => prev.filter(a => a.id !== id))} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Category</label>
          <select name="category_id" className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-ink text-sm outline-none focus:border-accent transition-colors" defaultValue={editingThought?.category_id || ''}>
            <option value="">Uncategorized</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1 flex items-center gap-2">
            <Lock size={10} className="text-accent" /> Unlock Date (Time Capsule)
          </label>
          <div className="relative">
            <Input name="unlock_at" type="date" className="pl-10" defaultValue={editingThought?.unlock_at ? format(parseISO(editingThought.unlock_at), 'yyyy-MM-dd') : ''} />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-accent">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-[9px] text-ink-muted italic ml-1">Seal this thought until a future date. It will be hidden until then.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Tags</label>
          <Input name="tags" placeholder="philosophy, ideas" defaultValue={editingThought?.tags || ''} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Link to Thought</label>
        <select name="parent_id" className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-ink text-sm outline-none focus:border-accent transition-colors" defaultValue={editingThought?.parent_id || ''}>
          <option value="">None</option>
          {thoughts.filter((t: any) => t.id !== editingThought?.id).map((t: any) => (
            <option key={t.id} value={t.id}>{t.title || t.text.substring(0, 30)}...</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Link to Document</label>
        <select name="document_id" className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-ink text-sm outline-none focus:border-accent transition-colors">
          <option value="">None</option>
          {documents.map((d: any) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>

      <div className="pt-6">
        <Button type="submit" className="w-full py-4 text-lg">Save Thought</Button>
      </div>
    </form>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isBackupPromptOpen, setIsBackupPromptOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' | 'info' }[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [promptConfig, setPromptConfig] = useState<{ isOpen: boolean, title: string, message: string, placeholder: string, onConfirm: (val: string) => void } | null>(null);
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || '');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [navHistory, setNavHistory] = useState<string[]>(['home']);
  const [capsules, setCapsules] = useState<Thought[]>([]);
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [isDocumentEditorOpen, setIsDocumentEditorOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isLinkThoughtModalOpen, setIsLinkThoughtModalOpen] = useState(false);
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [isGuidedFlowActive, setIsGuidedFlowActive] = useState(false);
  const [guidedFlowStep, setGuidedFlowStep] = useState(0);
  const [currentThoughtData, setCurrentThoughtData] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setConfirmConfig(null); } });
  };

  const promptAction = (title: string, message: string, placeholder: string, onConfirm: (val: string) => void) => {
    setPromptConfig({ isOpen: true, title, message, placeholder, onConfirm: (val: string) => { onConfirm(val); setPromptConfig(null); } });
  };

  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording, blobToBase64 } = useVoiceRecorder(showToast);

  const wisdomScore = useMemo(() => {
    return (thoughts.length * 1) + (questions.length * 2) + (purposes.length * 5) + (documents.length * 10);
  }, [thoughts, questions, purposes, documents]);

  const wisdomLevel = useMemo(() => {
    if (wisdomScore < 50) return { title: 'Sadhaka', desc: 'The Seeker' };
    if (wisdomScore < 150) return { title: 'Jigyasu', desc: 'The Curious' };
    if (wisdomScore < 300) return { title: 'Vicharak', desc: 'The Thinker' };
    if (wisdomScore < 600) return { title: 'Darshanik', desc: 'The Philosopher' };
    return { title: 'Rishi', desc: 'The Sage' };
  }, [wisdomScore]);

  // Notification System
  useEffect(() => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkNotifications = () => {
      const now = new Date();
      
      // 1. Daily Reflection (8 PM)
      const lastDaily = localStorage.getItem('last_daily_notif');
      const todayStr = now.toDateString();
      if (now.getHours() === 20 && lastDaily !== todayStr) {
        new Notification("Thought Shaastra", {
          body: "Time for your daily reflection. What's on your mind?",
          icon: "/favicon.png"
        });
        localStorage.setItem('last_daily_notif', todayStr);
      }

      // 2. Time Capsules
      capsules.forEach(capsule => {
        if (capsule.unlock_at) {
          const unlockDate = new Date(capsule.unlock_at);
          const lastCheck = localStorage.getItem(`notif_capsule_${capsule.id}`);
          if (now >= unlockDate && !lastCheck) {
            new Notification("Time Capsule Unlocked", {
              body: `Your thought from ${formatDate(capsule.created_at)} is ready to be revisited.`,
              icon: "/favicon.png"
            });
            localStorage.setItem(`notif_capsule_${capsule.id}`, 'sent');
          }
        }
      });
      // 3. Inactivity Notification (7 days)
      const lastActivity = localStorage.getItem('last_activity_timestamp');
      if (lastActivity) {
        const lastDate = new Date(parseInt(lastActivity));
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        const lastInactivityNotif = localStorage.getItem('last_inactivity_notif');
        
        if (diffDays >= 7 && lastInactivityNotif !== todayStr) {
          new Notification("Thought Shaastra", {
            body: "Your sanctuary has been quiet for a week. Your thoughts miss your presence. Shall we reflect on your journey today?",
            icon: "/favicon.png"
          });
          localStorage.setItem('last_inactivity_notif', todayStr);
        }
      }
    };

    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [capsules]);

  const changeTab = (tabId: string) => {
    if (tabId !== activeTab) {
      setNavHistory(prev => [...prev, tabId]);
      setActiveTab(tabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    if (navHistory.length > 1) {
      const newHistory = [...navHistory];
      newHistory.pop();
      const prevTab = newHistory[newHistory.length - 1];
      setNavHistory(newHistory);
      setActiveTab(prevTab);
    }
  };

  // Fetch Data
  const fetchData = async () => {
    try {
      const endpoints = [
        '/api/thoughts',
        '/api/categories',
        '/api/purpose',
        '/api/stats',
        '/api/questions',
        '/api/auth/me',
        '/api/time-capsules',
        '/api/insights/activity',
        '/api/documents'
      ];

      const responses = await Promise.all(endpoints.map(url => fetch(url)));
      
      const results = await Promise.all(responses.map(async (res) => {
        if (!res.ok) return null;
        try {
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        } catch (e) {
          console.error(`Error parsing JSON from ${res.url}:`, e);
          return null;
        }
      }));

      const [
        serverThoughts, 
        categoriesData, 
        purposesData, 
        statsData, 
        questionsData, 
        userData, 
        capsulesData, 
        activityData, 
        docsData
      ] = results;

      if (userData) setUser(userData);
      
      if (serverThoughts) {
        const localThoughts = JSON.parse(localStorage.getItem('guest_thoughts') || '[]');
        setThoughts([...serverThoughts, ...localThoughts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      
      if (categoriesData) setCategories(categoriesData);
      if (purposesData) setPurposes(purposesData);
      if (statsData) setStats(statsData);
      if (questionsData) setQuestions(questionsData);
      if (capsulesData) setCapsules(capsulesData);
      if (activityData) setActivityData(activityData);
      if (docsData) setDocuments(docsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      const localThoughts = JSON.parse(localStorage.getItem('guest_thoughts') || '[]');
      setThoughts(localThoughts);
    }
  };

  useEffect(() => {
    fetchData();
    const isFirstTime = !localStorage.getItem('has_visited');
    if (isFirstTime) {
      setIsWelcomeOpen(true);
      localStorage.setItem('has_visited', 'true');
    }
    if (!localStorage.getItem('user_name') && !user) {
      setIsNameModalOpen(true);
    }
  }, []);

  // Backup Prompt Logic
  useEffect(() => {
    if (!user && thoughts.length >= 5 && !localStorage.getItem('backup_prompt_dismissed')) {
      setIsBackupPromptOpen(true);
    }
  }, [thoughts.length, user]);

  const handleSync = async () => {
    const localThoughts = JSON.parse(localStorage.getItem('guest_thoughts') || '[]');
    const localQuestions = JSON.parse(localStorage.getItem('guest_questions') || '[]');
    const localPurpose = JSON.parse(localStorage.getItem('guest_purpose') || '[]');
    
    if (localThoughts.length > 0 || localQuestions.length > 0 || localPurpose.length > 0) {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          thoughts: localThoughts, 
          questions: localQuestions, 
          purpose: localPurpose 
        })
      });
      if (res.ok) {
        localStorage.removeItem('guest_thoughts');
        localStorage.removeItem('guest_questions');
        localStorage.removeItem('guest_purpose');
        fetchData();
      }
    }
  };

  const handleSaveThought = async (thoughtData: any) => {
    localStorage.setItem('last_activity_timestamp', Date.now().toString());
    
    // If we are starting a new thought from the home screen, trigger guided flow
    if (!editingThought && !isGuidedFlowActive && activeTab === 'home') {
      setCurrentThoughtData(thoughtData);
      setIsGuidedFlowActive(true);
      setGuidedFlowStep(1);
      return;
    }

    const payload = {
      ...thoughtData,
      expression: thoughtData.expression || null,
      meaning: thoughtData.meaning || null,
      clarity: thoughtData.clarity || null,
      is_insight: thoughtData.is_insight || 0,
      unlock_at: thoughtData.unlock_at ? new Date(thoughtData.unlock_at).toISOString() : null,
      is_private: 1,
      attachments: thoughtData.attachments ? JSON.stringify(thoughtData.attachments) : null
    };

    if (user) {
      if (editingThought) {
        const res = await fetch(`/api/thoughts/${editingThought.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchData();
          setIsWriting(false);
          setEditingThought(null);
        }
      } else {
        const res = await fetch('/api/thoughts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const savedThought = await res.json();
          if (savedThought && savedThought.id) {
            if (payload.parent_id) {
              await fetch('/api/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thought_a_id: payload.parent_id, thought_b_id: savedThought.id })
              });
            }
            if (payload.document_id) {
              await fetch(`/api/documents/${payload.document_id}/link/${savedThought.id}`, {
                method: 'POST'
              });
            }
          }
          fetchData();
          setIsWriting(false);
          setEditingThought(null);
        }
      }
    } else {
      const newThought = {
        ...payload,
        id: editingThought?.id || Date.now(),
        created_at: editingThought?.created_at || new Date().toISOString(),
        category_name: categories.find(c => c.id === parseInt(payload.category_id))?.name || 'Uncategorized'
      };
      
      const local = JSON.parse(localStorage.getItem('guest_thoughts') || '[]');
      if (editingThought) {
        const index = local.findIndex((t: any) => t.id === editingThought.id);
        if (index !== -1) local[index] = newThought;
      } else {
        local.unshift(newThought);
      }
      
      localStorage.setItem('guest_thoughts', JSON.stringify(local));
      
      if (payload.parent_id && !editingThought) {
        const localConnections = JSON.parse(localStorage.getItem('guest_connections') || '[]');
        localStorage.setItem('guest_connections', JSON.stringify([{ id: Date.now(), thought_a_id: payload.parent_id, thought_b_id: newThought.id }, ...localConnections]));
      }
      
      fetchData();
      setIsWriting(false);
      setEditingThought(null);
    }

    // Reset flow state
    setIsGuidedFlowActive(false);
    setGuidedFlowStep(0);
    setCurrentThoughtData(null);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      const userData = await res.json();
      if (userData) {
        setUser(userData);
        setIsAuthModalOpen(false);
        handleSync();
        showToast('Welcome to your sanctuary', 'success');
      }
    } else {
      showToast('Authentication failed. Please check your credentials.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Clear any guest data if necessary or just refresh
      fetchData();
    }
  };

  const filteredThoughts = useMemo(() => {
    return thoughts.filter(t => 
      t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [thoughts, searchQuery]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(d => 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const unlockedCapsulesCount = useMemo(() => {
    return thoughts.filter(t => 
      t.unlock_at && 
      !isAfter(parseISO(t.unlock_at), new Date())
    ).length;
  }, [thoughts]);

  const groupedThoughts = useMemo(() => {
    const groups: { [key: string]: Thought[] } = {};
    filteredThoughts.forEach(t => {
      // Skip future capsules in the main timeline
      if (t.unlock_at && isAfter(parseISO(t.unlock_at), new Date())) {
        return;
      }
      const monthYear = format(parseISO(t.created_at), 'MMMM yyyy');
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(t);
    });
    return groups;
  }, [filteredThoughts]);

  const streak = useMemo(() => {
    if (thoughts.length === 0) return 0;
    const dates = [...new Set(thoughts.map(t => format(parseISO(t.created_at), 'yyyy-MM-dd')))].sort().reverse() as string[];
    let currentStreak = 0;
    let today = new Date();
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === currentStreak || diff === currentStreak + 1) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [thoughts]);

  const discoveredConnections = useMemo(() => {
    if (thoughts.length < 2) return [];
    
    const connections: { type: string, thoughtA: Thought, thoughtB: Thought, reason: string }[] = [];
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'your', 'from', 'have', 'what', 'about', 'there', 'their']);

    for (let i = 0; i < thoughts.length; i++) {
      for (let j = i + 1; j < thoughts.length; j++) {
        const a = thoughts[i];
        const b = thoughts[j];
        
        // 1. Tag Synergy
        const tagsA = a.tags?.split(',').map(t => t.trim().toLowerCase()).filter(t => t) || [];
        const tagsB = b.tags?.split(',').map(t => t.trim().toLowerCase()).filter(t => t) || [];
        const commonTags = tagsA.filter(t => tagsB.includes(t));
        
        if (commonTags.length > 0) {
          connections.push({
            type: 'Tag Synergy',
            thoughtA: a,
            thoughtB: b,
            reason: `Both explore "${commonTags[0]}"`
          });
          continue;
        }

        // 2. Temporal Echo (Same day of year)
        const dateA = parseISO(a.created_at);
        const dateB = parseISO(b.created_at);
        if (dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate() && a.id !== b.id) {
          connections.push({
            type: 'Temporal Echo',
            thoughtA: a,
            thoughtB: b,
            reason: `Created on the same day of the year (${format(dateA, 'MMM d')})`
          });
          continue;
        }

        // 3. Keyword Resonance
        const wordsA = a.text.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !stopWords.has(w));
        const wordsB = b.text.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !stopWords.has(w));
        const commonWords = wordsA.filter(w => wordsB.includes(w));
        
        if (commonWords.length > 0) {
          connections.push({
            type: 'Keyword Resonance',
            thoughtA: a,
            thoughtB: b,
            reason: `Both mention "${commonWords[0]}"`
          });
        }
      }
    }
    
    return connections.sort(() => Math.random() - 0.5).slice(0, 12);
  }, [thoughts]);

  const thoughtOfTheDay = useMemo(() => {
    if (thoughts.length === 0) return null;
    const seed = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return thoughts[Math.abs(hash) % thoughts.length];
  }, [thoughts]);

  return (
    <div className="min-h-screen bg-bg text-ink transition-colors duration-300">
      {/* Guided Flow Overlay */}
      <AnimatePresence>
        {isGuidedFlowActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="max-w-2xl w-full space-y-12">
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-bold uppercase tracking-widest">
                  {guidedFlowStep <= 3 ? `Step ${guidedFlowStep} of 3` : 'Final Step'}
                </div>
                <h2 className="text-4xl font-black text-ink">
                  {guidedFlowStep === 1 && "What’s really on your mind?"}
                  {guidedFlowStep === 2 && "Why does this matter to you?"}
                  {guidedFlowStep === 3 && "What do you want to do or understand now?"}
                  {guidedFlowStep === 4 && "Save this as an insight?"}
                </h2>
              </div>

              <Card className="p-8 space-y-8 bg-surface border-border shadow-2xl">
                {guidedFlowStep === 1 && (
                  <div className="space-y-6">
                    <TextArea 
                      id="guided-expression"
                      placeholder="Write freely..."
                      className="min-h-[150px] text-lg"
                    />
                    <div className="flex gap-4">
                      <Button variant="outline" className="flex-1" onClick={() => setGuidedFlowStep(2)}>Skip</Button>
                      <Button className="flex-1" onClick={() => {
                        const val = (document.getElementById('guided-expression') as HTMLTextAreaElement).value;
                        setCurrentThoughtData((prev: any) => ({ ...prev, expression: val }));
                        setGuidedFlowStep(2);
                      }}>Continue</Button>
                    </div>
                  </div>
                )}

                {guidedFlowStep === 2 && (
                  <div className="space-y-6">
                    <TextArea 
                      id="guided-meaning"
                      placeholder="How does this make you feel or what does it mean to you?"
                      className="min-h-[150px] text-lg"
                    />
                    <div className="flex gap-4">
                      <Button variant="outline" className="flex-1" onClick={() => setGuidedFlowStep(3)}>Skip</Button>
                      <Button className="flex-1" onClick={() => {
                        const val = (document.getElementById('guided-meaning') as HTMLTextAreaElement).value;
                        setCurrentThoughtData((prev: any) => ({ ...prev, meaning: val }));
                        setGuidedFlowStep(3);
                      }}>Continue</Button>
                    </div>
                  </div>
                )}

                {guidedFlowStep === 3 && (
                  <div className="space-y-6">
                    <TextArea 
                      id="guided-clarity"
                      placeholder="Create direction or next steps..."
                      className="min-h-[150px] text-lg"
                    />
                    <div className="flex gap-4">
                      <Button variant="outline" className="flex-1" onClick={() => setGuidedFlowStep(4)}>Skip</Button>
                      <Button className="flex-1" onClick={() => {
                        const val = (document.getElementById('guided-clarity') as HTMLTextAreaElement).value;
                        setCurrentThoughtData((prev: any) => ({ ...prev, clarity: val }));
                        setGuidedFlowStep(4);
                      }}>Finish</Button>
                    </div>
                  </div>
                )}

                {guidedFlowStep === 4 && (
                  <div className="space-y-6">
                    <p className="text-ink-muted text-center font-serif italic">Would you like to highlight this as a core insight in your wisdom archive?</p>
                    <div className="flex flex-col gap-4">
                      <Button className="w-full h-14 text-lg font-bold" onClick={() => handleSaveThought({ ...currentThoughtData, is_insight: 1 })}>
                        Save as Insight
                      </Button>
                      <Button variant="outline" className="w-full h-14 text-lg" onClick={() => handleSaveThought({ ...currentThoughtData, is_insight: 0 })}>
                        Keep as Thought
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <div className="text-center">
                <button 
                  onClick={() => {
                    setIsGuidedFlowActive(false);
                    setGuidedFlowStep(0);
                    setCurrentThoughtData(null);
                  }}
                  className="text-ink-muted hover:text-accent text-sm font-bold uppercase tracking-widest"
                >
                  Cancel Flow
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-bg/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-12 z-50">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          {activeTab !== 'home' && (
            <button 
              onClick={() => setActiveTab('home')} 
              className="flex items-center gap-2 text-ink-muted hover:text-accent transition-all group shrink-0"
            >
              <div className="p-1.5 sm:p-2 rounded-full group-hover:bg-surface transition-all">
                <ArrowRight size={16} className="rotate-180 sm:hidden" />
                <ArrowRight size={20} className="rotate-180 hidden sm:block" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
            </button>
          )}
          <Logo />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button onClick={() => changeTab('capsule')} className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-ink-muted hover:text-accent transition-all">
            <Lock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Time Capsules</span>
          </button>
          <div className="hidden lg:flex flex-col items-end mr-4">
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Current Session</span>
            <span className="text-xs font-serif italic text-ink-muted">{format(new Date(), 'MMMM do, yyyy')}</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 border-l border-border">
              <div className="flex flex-col items-end mr-2 hidden sm:flex">
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{wisdomLevel.title}</span>
                <span className="text-[8px] text-ink-muted uppercase tracking-tighter">{wisdomScore} Wisdom Points</span>
              </div>
              <div className="flex flex-col items-end max-w-[80px] sm:max-w-[150px]">
                <p className="text-[10px] sm:text-sm font-bold text-ink truncate w-full text-right">{user.name || user.email}</p>
                <button onClick={handleLogout} className="text-[8px] sm:text-[10px] text-ink-muted hover:text-red-400 font-bold uppercase tracking-widest transition-colors">
                  Logout
                </button>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-surface border border-border flex items-center justify-center text-accent shadow-lg">
                <UserIcon size={16} className="sm:hidden" />
                <UserIcon size={20} className="hidden sm:block" />
              </div>
            </div>
          ) : (
            <Button variant="primary" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base" onClick={() => setIsAuthModalOpen(true)}>
              <Cloud size={14} className="sm:hidden" />
              <Cloud size={18} className="hidden sm:block" />
              <span className="hidden sm:inline">Backup</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-24 pb-32 px-4 lg:px-12 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'documents' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="documents" className="space-y-8">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-5xl font-black text-ink">Documents</h2>
                  <p className="text-ink-muted font-serif italic text-xl">Long-form explorations of your mind</p>
                </div>
                <Button className="h-12 px-6 rounded-xl shadow-lg shadow-accent/20" onClick={() => setIsCreateDocumentModalOpen(true)}>
                  <Plus size={20} /> Create Document
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.map(doc => (
                  <Card key={doc.id} className="group hover:border-accent transition-all cursor-pointer p-8" onClick={() => {
                    fetch(`/api/documents/${doc.id}`).then(res => res.ok ? res.json() : null).then(data => {
                      if (data) {
                        setActiveDocument(data);
                        setIsDocumentEditorOpen(true);
                      }
                    });
                  }}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border">
                        <BookOpen size={24} />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          confirmAction('Delete Document', 'Are you sure you want to delete this document?', () => {
                            fetch(`/api/documents/${doc.id}`, { method: 'DELETE' }).then(() => fetchData());
                          });
                        }} className="p-2 text-ink-muted hover:text-red-500 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-ink">{doc.title}</h3>
                    <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">
                      Last edited {formatDate(doc.updated_at)}
                    </p>
                    {doc.description && <p className="mt-6 text-ink-muted text-sm line-clamp-2 italic leading-relaxed">"{doc.description}"</p>}
                  </Card>
                ))}
                {documents.length === 0 && (
                  <div className="md:col-span-2 py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-surface rounded-3xl flex items-center justify-center mx-auto text-border border border-border">
                      <BookOpen size={48} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-ink">No documents yet</h3>
                      <p className="text-ink-muted">Start a long-form writing project to organize your thoughts.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="categories" className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black mb-4 text-ink">Categories</h2>
                <p className="text-ink-muted font-serif italic text-xl">The taxonomy of your mind</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(category => {
                  const thoughtCount = thoughts.filter(t => t.category_id === category.id).length;
                  return (
                    <Card key={category.id} className="group hover:border-accent transition-all cursor-pointer p-8" onClick={() => {
                      setSearchQuery(category.name);
                      changeTab('home');
                    }}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border">
                          <Hash size={24} />
                        </div>
                        <span className="text-3xl font-black text-border">{thoughtCount}</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-1 text-ink">{category.name}</h3>
                      <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">Reflections</p>
                    </Card>
                  );
                })}
                <Card className="bg-surface/50 border-dashed border-2 border-border flex flex-col items-center justify-center p-8 text-center">
                  <Plus size={32} className="text-border mb-4" />
                  <h3 className="text-lg font-bold mb-4 text-ink">New Category</h3>
                  <div className="flex gap-2 w-full">
                    <Input id="new-category-name" placeholder="Name..." className="flex-1" />
                    <Button onClick={async () => {
                      const input = document.getElementById('new-category-name') as HTMLInputElement;
                      const name = input.value;
                      if (name.trim()) {
                        await fetch('/api/categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name })
                        });
                        input.value = '';
                        fetchData();
                      }
                    }}>Add</Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'home' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              key="home" 
              className="space-y-24 pb-20"
            >
              {/* Hero Section - REDESIGNED */}
              <section className="text-center space-y-12 pt-16 max-w-4xl mx-auto px-6">
                <div className="space-y-8">
                  <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-ink leading-tight">
                    {userName ? `${userName}, what` : 'What'} are you <br />
                    <span className="text-accent italic font-serif">thinking right now?</span>
                  </h2>
                  
                  <div className="relative group">
                    <TextArea 
                      id="home-thought-input"
                      placeholder="Start with one thought. The rest will follow." 
                      className="min-h-[150px] text-xl p-8 rounded-[2rem] border-2 border-border focus:border-accent shadow-xl transition-all bg-surface/50 backdrop-blur-sm"
                    />
                    <div className="absolute bottom-4 right-4">
                      <Button 
                        onClick={() => {
                          const input = document.getElementById('home-thought-input') as HTMLTextAreaElement;
                          if (input.value.trim()) {
                            handleSaveThought({ text: input.value, type: 'text' });
                            input.value = '';
                          } else {
                            showToast('Please enter a thought first', 'info');
                          }
                        }}
                        className="h-14 px-8 rounded-2xl text-lg font-black shadow-lg shadow-accent/20"
                      >
                        Write Thought →
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Simple Intro */}
                <div className="max-w-2xl mx-auto space-y-6 bg-accent/5 p-8 rounded-[2rem] border border-accent/10">
                  <h3 className="text-2xl font-black text-ink">What is Thought Shaastra?</h3>
                  <p className="text-lg text-ink-muted leading-relaxed">
                    It's a simple space to <span className="text-accent font-bold">clear your mind</span>. 
                    No complex tools, just you and your thoughts.
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm font-bold text-accent uppercase tracking-widest">
                    <span>Capture</span>
                    <div className="w-1 h-1 rounded-full bg-accent/30" />
                    <span>Understand</span>
                    <div className="w-1 h-1 rounded-full bg-accent/30" />
                    <span>Grow</span>
                  </div>
                  <p className="text-xs text-ink-muted italic">
                    Tip: Write <span className="font-bold text-ink">3 thoughts</span> to unlock deeper layers of your mind.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <button onClick={() => changeTab('timeline')} className="flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-2xl text-sm font-bold text-ink-muted hover:text-accent hover:border-accent transition-all">
                    <History size={18} /> Continue thinking
                  </button>
                  <button onClick={() => changeTab('timeline')} className="flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-2xl text-sm font-bold text-ink-muted hover:text-accent hover:border-accent transition-all">
                    <BookOpen size={18} /> View past thoughts
                  </button>
                </div>
              </section>

              {/* Recent Thoughts - Simplified */}
              <section className="max-w-6xl mx-auto px-6 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-ink">Recent Sutras</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-bold uppercase tracking-widest">
                    <Calendar size={12} /> {streak} Day Streak
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {thoughts.slice(0, 3).map(thought => (
                    <Card key={thought.id} className="p-6 space-y-4 hover:border-accent transition-all cursor-pointer" onClick={() => { setEditingThought(thought); setIsWriting(true); }}>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{thought.category_name || 'Uncategorized'}</span>
                        <span className="text-[10px] text-ink-muted">{formatDate(thought.created_at)}</span>
                      </div>
                      <p className="text-sm text-ink-muted line-clamp-3 leading-relaxed font-serif italic">"{thought.text}"</p>
                    </Card>
                  ))}
                  {thoughts.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-3xl bg-surface/30">
                      <p className="text-ink-muted font-serif italic">"Start with one thought. The rest will follow."</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Insights & Wisdom - MOVED TO HOME */}
              <section className="max-w-6xl mx-auto px-6 space-y-12">
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-black text-ink">Your Wisdom Patterns</h3>
                  <p className="text-ink-muted">Visualise your thinking journey and progress.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="h-[300px] flex flex-col p-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-6">Thought Frequency</h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activityData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} 
                            tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                          />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="var(--color-accent)" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: 'var(--color-accent)' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="h-[300px] flex flex-col p-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-6">Category Distribution</h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {stats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#C49B66', '#A67C52', '#8B6944', '#705637', '#55432A'][index % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </section>

              {/* Progressive Reveal: Layers of Thought */}
              {thoughts.length >= 3 && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-6xl mx-auto px-6 space-y-16"
                >
                  <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-bold uppercase tracking-[0.3em]">System Unlocked</div>
                    <h3 className="text-4xl font-black text-ink">You’ve started building your thinking system.</h3>
                    <p className="text-ink-muted text-lg">The Layers of Thought are now revealing themselves to you.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* CAPTURE */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                          <Mic size={16} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-ink-muted">Capture</h4>
                      </div>
                      <div className="space-y-4">
                        <button onClick={() => changeTab('timeline')} className="w-full p-6 bg-surface border border-border rounded-3xl text-left hover:border-accent transition-all group">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">Timeline</h5>
                          <p className="text-xs text-ink-muted mt-1">Quick thoughts and daily reflections.</p>
                        </button>
                        <button onClick={() => changeTab('questions')} className="w-full p-6 bg-surface border border-border rounded-3xl text-left hover:border-accent transition-all group">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">Questions</h5>
                          <p className="text-xs text-ink-muted mt-1">Structured thinking prompts to spark curiosity.</p>
                        </button>
                      </div>
                    </div>

                    {/* DEVELOP */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                          <BookOpen size={16} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-ink-muted">Develop</h4>
                      </div>
                      <div className="space-y-4">
                        <button onClick={() => changeTab('documents')} className="w-full p-6 bg-surface border border-border rounded-3xl text-left hover:border-accent transition-all group">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">Documents</h5>
                          <p className="text-xs text-ink-muted mt-1">Long-form thinking and detailed research.</p>
                        </button>
                        <button onClick={() => changeTab('graph')} className="w-full p-6 bg-surface border border-border rounded-3xl text-left hover:border-accent transition-all group">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">Connections</h5>
                          <p className="text-xs text-ink-muted mt-1">Visualise how your ideas link together.</p>
                        </button>
                      </div>
                    </div>

                    {/* REFLECT */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">
                          <Lock size={16} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-ink-muted">Reflect</h4>
                      </div>
                      <div className="space-y-4">
                        <button onClick={() => changeTab('capsule')} className="w-full p-6 bg-surface border border-border rounded-3xl text-left hover:border-accent transition-all group">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">Time Capsules</h5>
                          <p className="text-xs text-ink-muted mt-1">Lock thoughts for your future self to unlock.</p>
                        </button>
                        <button onClick={() => changeTab('insights')} className="w-full p-6 bg-surface border border-border rounded-3xl text-left hover:border-accent transition-all group">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">Insights</h5>
                          <p className="text-xs text-ink-muted mt-1">Patterns and progress in your thinking.</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Thinking Flow Section */}
              <section className="max-w-6xl mx-auto px-6 space-y-16">
                <div className="text-center space-y-4">
                  <h3 className="text-4xl font-black text-ink">The Thinking Flow</h3>
                  <p className="text-ink-muted text-lg">From a spark of an idea to a lifetime of wisdom.</p>
                </div>

                <div className="relative">
                  <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-accent/20 -translate-y-1/2 z-0" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 relative z-10">
                    {[
                      { label: 'Capture', desc: 'Timeline & Questions', icon: Mic, term: 'Sutra' },
                      { label: 'Expand', desc: 'Long-form Documents', icon: BookOpen, term: 'Grantha' },
                      { label: 'Organise', desc: 'Structured Categories', icon: Hash, term: 'Varga' },
                      { label: 'Derive', desc: 'Extract Core Insights', icon: BarChart3, term: 'Gyan' },
                      { label: 'Reflect', desc: 'Future Time Capsules', icon: Lock, term: 'Kala' },
                      { label: 'Evolve', desc: 'A Lifetime of Wisdom', icon: Sunrise, term: 'Moksha' },
                    ].map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center text-center space-y-6 group">
                        <div className="relative">
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-bg text-[10px] font-bold flex items-center justify-center z-20 border-2 border-surface">
                            {idx + 1}
                          </div>
                          <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center text-accent shadow-xl group-hover:border-accent group-hover:shadow-accent/20 transition-all duration-500 relative z-10">
                            <step.icon size={28} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h5 className="font-bold text-ink group-hover:text-accent transition-colors">{step.label}</h5>
                          <div className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                            <p className="text-[10px] text-accent font-bold uppercase tracking-widest">{step.term}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Why Thought Shaastra? */}
              <section className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <h3 className="text-4xl font-black text-ink">Why Thought Shaastra?</h3>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-900/20 flex items-center justify-center text-red-400 shrink-0">
                          <X size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-ink">Thoughts are scattered</h4>
                          <p className="text-ink-muted">Valuable insights are lost in the noise of daily life.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-900/20 flex items-center justify-center text-red-400 shrink-0">
                          <X size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-ink">Insights are forgotten</h4>
                          <p className="text-ink-muted">Without a system, your best ideas never reach their potential.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Card className="p-12 bg-accent/5 border-accent/20 flex flex-col justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-accent/40">
                      <Feather size={40} className="text-bg" />
                    </div>
                    <h4 className="text-3xl font-black text-ink">The Solution</h4>
                    <p className="text-xl text-ink-muted font-serif italic">
                      Thought Shaastra turns thinking into a structured system.
                    </p>
                  </Card>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="timeline" className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                <div>
                  <h2 className="text-5xl font-black text-ink">Timeline</h2>
                  <p className="text-ink-muted font-serif italic text-xl mt-2">The chronological flow of your mind</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                    <Input 
                      placeholder="Search timeline..." 
                      className="pl-12 py-2"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setIsWriting(true)}>
                    <Plus size={20} /> Write
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-accent font-black text-2xl">{streak}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Day Streak</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-accent font-black text-2xl">{thoughts.length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Total Thoughts</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-accent font-black text-2xl">{thoughts.filter(t => t.type === 'voice').length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Voice Notes</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-accent font-black text-2xl">{Math.round(thoughts.length * 1.5 + purposes.length * 5)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Wisdom Score</span>
                </Card>
              </div>

              {/* Thought of the Day */}
              {thoughtOfTheDay && !searchQuery && (
                <Card className="bg-accent/5 border-accent/20 p-10 text-center relative overflow-hidden">
                  <Quote className="mx-auto mb-6 text-accent/40" size={32} />
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] mb-8">Thought of the Day</h3>
                  <p className="text-3xl font-serif leading-relaxed text-ink italic">
                    "{thoughtOfTheDay.text}"
                  </p>
                  <div className="mt-10 flex items-center justify-center gap-4 text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                    <span>{formatDate(thoughtOfTheDay.created_at)}</span>
                    <div className="w-1 h-1 rounded-full bg-border" />
                    <span>{thoughtOfTheDay.category_name || 'Uncategorized'}</span>
                  </div>
                </Card>
              )}

              {/* Timeline List */}
              <div className="max-w-4xl mx-auto relative pt-8">
                <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden sm:block" />
                
                {Object.entries(groupedThoughts).map(([date, dateThoughts]) => (
                  <div key={date} className="space-y-8 mb-16 relative">
                    <div className="sticky top-24 z-10 flex justify-center mb-8">
                      <div className="px-6 py-2 bg-surface border border-border rounded-full text-xs font-bold uppercase tracking-widest text-accent shadow-sm">
                        {date}
                      </div>
                    </div>

                    <div className="space-y-12">
                      {(dateThoughts as any[]).map((item: any, idx: number) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          className={cn(
                            "relative flex flex-col sm:flex-row items-center gap-8",
                            idx % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                          )}
                        >
                          {/* Timeline Dot */}
                          <div className="absolute left-4 sm:left-1/2 w-4 h-4 bg-accent rounded-full border-4 border-bg -translate-x-1/2 z-10 hidden sm:block" />
                          
                          <div className="w-full sm:w-1/2">
                            <Card 
                              className={cn(
                                "p-6 hover:border-accent transition-all cursor-pointer group",
                                item.is_insight ? "bg-accent/5 border-accent/20" : "bg-surface"
                              )}
                              onClick={() => { setEditingThought(item); setIsWriting(true); }}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                  {item.is_insight ? (
                                    <Sunrise size={14} className="text-accent" />
                                  ) : item.unlock_at ? (
                                    <Lock size={14} className="text-ink-muted" />
                                  ) : (
                                    <Edit3 size={14} className="text-ink-muted" />
                                  )}
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                                    {item.is_insight ? 'Insight' : item.unlock_at ? 'Time Capsule' : 'Thought'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-ink-muted font-mono">{formatTime(item.created_at)}</span>
                              </div>
                              
                              <p className="text-ink leading-relaxed font-serif italic mb-4">
                                "{item.text}"
                              </p>

                              {item.expression && (
                                <div className="mt-4 p-3 bg-bg/50 rounded-xl border border-border/50">
                                  <p className="text-[10px] font-bold uppercase text-ink-muted mb-1">Expression</p>
                                  <p className="text-xs text-ink-muted line-clamp-2">{item.expression}</p>
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                {item.tags?.split(',').filter(Boolean).map((tag: string) => (
                                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-surface border border-border rounded-full text-ink-muted">#{tag}</span>
                                ))}
                              </div>
                            </Card>
                          </div>
                          <div className="hidden sm:block w-1/2" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'guide' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} key="guide" className="max-w-3xl mx-auto space-y-12">
              <div className="text-center">
                <h2 className="text-5xl font-black mb-4 text-ink">How to use Shaastra</h2>
                <p className="text-ink-muted text-xl font-serif italic">A guide to your digital sanctuary</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mb-6">
                    <Edit3 size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-ink">Capture Thoughts</h3>
                  <p className="text-ink-muted leading-relaxed">
                    Write down anything that comes to mind. Use the voice feature if you're on the move. Categorize them to keep your mind organized.
                  </p>
                </Card>
                <Card className="p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mb-6">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-ink">Time Capsules</h3>
                  <p className="text-ink-muted leading-relaxed">
                    Write a message to your future self and set an unlock date. The thought will remain sealed until that specific moment in time.
                  </p>
                </Card>
                <Card className="p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mb-6">
                    <Target size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-ink">Principles & Questions</h3>
                  <p className="text-ink-muted leading-relaxed">
                    Define your core values in the Principles section. Keep track of the big questions you're currently exploring in the Questions tab.
                  </p>
                </Card>
                <Card className="p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mb-6">
                    <Cloud size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-ink">Optional Backup</h3>
                  <p className="text-ink-muted leading-relaxed">
                    Your thoughts are stored locally by default. Create an account to safely back them up to our secure cloud and sync across all your devices.
                  </p>
                </Card>
              </div>

              <Card className="p-10 bg-surface border-accent/20 text-center">
                <h3 className="text-2xl font-bold mb-4 text-ink">Philosophy of Thought Shaastra</h3>
                <p className="text-ink-muted font-serif italic text-lg leading-relaxed max-w-xl mx-auto">
                  "This is not a social network. It is a personal sanctuary. No likes, no comments, no distractions. Just you and your thoughts, preserved forever."
                </p>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="settings" className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-5xl font-black text-ink">Settings</h2>
              
              <Card className="space-y-6 p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-ink">Backup Status</h3>
                    <p className="text-xs text-ink-muted">{user ? 'Your thoughts are safely backed up to the cloud.' : 'Thoughts are currently stored locally on this device.'}</p>
                  </div>
                  {user ? (
                    <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                      <Check size={16} /> Synced
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setIsAuthModalOpen(true)}>Enable Backup</Button>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-ink">Export Data</h3>
                    <p className="text-xs text-ink-muted">Download your entire thought archive.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const text = thoughts.map(t => `${formatDate(t.created_at)} - ${t.title || 'Untitled'}\n${t.text}\n\n`).join('');
                      const blob = new Blob([text], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'thought-shaastra-export.txt';
                      a.click();
                    }}>Text</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const doc = new jsPDF();
                      doc.setFontSize(20);
                      doc.text("Thought Shaastra Export", 20, 20);
                      doc.setFontSize(10);
                      thoughts.forEach((t, i) => {
                        if (i < 30) {
                          doc.text(`${formatDate(t.created_at)}: ${t.text.substring(0, 90)}...`, 20, 40 + (i * 8));
                        }
                      });
                      doc.save("thought-shaastra-export.pdf");
                    }}>PDF</Button>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-ink">Theme</h3>
                    <p className="text-xs text-ink-muted">Shaastra uses a warm, deep dark theme designed for focus.</p>
                  </div>
                  <div className="px-4 py-2 bg-surface border border-border rounded-xl text-accent text-xs font-bold uppercase tracking-widest">
                    Warm Dark
                  </div>
                </div>

                {user && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-red-500">Danger Zone</h3>
                        <p className="text-xs text-slate-500">Permanently delete your account and all thoughts.</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={async () => {
                        confirmAction('Delete Account', 'Are you absolutely sure? This cannot be undone.', async () => {
                          await fetch('/api/auth/account', { method: 'DELETE' });
                          setUser(null);
                          fetchData();
                          showToast('Account deleted', 'info');
                        });
                      }}>Delete Account</Button>
                    </div>
                  </>
                )}
              </Card>

              <div className="text-center pt-8">
                <p className="text-xs text-slate-400">Thought Shaastra v2.0 • Crafted for reflection</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'capsule' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="capsule" className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black mb-4 text-ink">Time Capsules</h2>
                <p className="text-ink-muted font-serif italic text-xl">Messages to your future self</p>
                {unlockedCapsulesCount > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-bold animate-bounce">
                    <Flower2 size={16} /> {unlockedCapsulesCount} Capsules Unlocked!
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {thoughts.filter(t => t.unlock_at).map(capsule => {
                  const isLocked = isAfter(parseISO(capsule.unlock_at!), new Date());
                  return (
                    <Card key={capsule.id} className={cn("relative overflow-hidden group", isLocked ? "opacity-75 grayscale" : "border-accent/30")}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          {isLocked ? <Lock size={16} className="text-ink-muted" /> : <Unlock size={16} className="text-accent" />}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                            {isLocked ? `Unlocks ${formatDate(capsule.unlock_at!)}` : `Unlocked ${formatDate(capsule.unlock_at!)}`}
                          </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingThought(capsule); setIsWriting(true); }} className="p-1.5 text-ink-muted hover:text-accent rounded-lg">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className={cn("text-lg font-serif leading-relaxed", isLocked ? "blur-sm select-none" : "text-ink")}>
                        {isLocked ? "This thought is sealed in time. It will be revealed when the moment is right." : capsule.text}
                      </p>
                      {!isLocked && capsule.audio_data && <VoicePlayer audioData={capsule.audio_data} />}
                      {capsule.parent_id && !isLocked && (
                        <button 
                          onClick={() => {
                            const parent = thoughts.find(p => p.id === capsule.parent_id);
                            if (parent) {
                              setEditingThought(parent);
                              setIsWriting(true);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 uppercase tracking-widest mt-4"
                        >
                          <LinkIcon size={12} /> Linked to Thought
                        </button>
                      )}
                    </Card>
                  );
                })}
                <Card className="bg-surface/50 border-dashed border-2 border-border flex flex-col items-center justify-center p-12 text-center">
                  <Lock size={48} className="text-border mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-ink">Create a Time Capsule</h3>
                  <p className="text-ink-muted text-sm mb-6">Seal a thought today to be opened in the future.</p>
                  <Button onClick={() => setIsWriting(true)}>
                    <Plus size={20} /> New Capsule
                  </Button>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'graph' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="graph" className="space-y-12">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black mb-4 text-ink">Connections</h2>
                <p className="text-ink-muted font-serif italic text-xl">The invisible threads between your ideas</p>
              </div>

              <div className="space-y-8 max-w-3xl mx-auto">
                {thoughts.map(thought => {
                  const linkedInsights = thoughts.filter(t => t.parent_id === thought.id && t.is_insight);
                  const linkedCapsules = thoughts.filter(t => t.parent_id === thought.id && t.unlock_at);
                  const childThoughts = thoughts.filter(t => t.parent_id === thought.id && !t.is_insight && !t.unlock_at);
                  const parentThought = thoughts.find(t => t.id === thought.parent_id);

                  if (!parentThought && linkedInsights.length === 0 && linkedCapsules.length === 0 && childThoughts.length === 0) return null;

                  return (
                    <Card key={thought.id} className="p-8 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Main Thought</span>
                          <span className="text-[10px] text-ink-muted">{formatDate(thought.created_at)}</span>
                        </div>
                        <p className="text-lg font-bold text-ink leading-tight">{thought.text}</p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="text-xs font-black uppercase tracking-widest text-ink-muted">Connected Thinking</h4>
                        
                        <div className="space-y-3">
                          {parentThought && (
                            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                              <ArrowRight size={14} className="rotate-180 text-accent" />
                              <div>
                                <p className="text-[10px] font-bold uppercase text-accent">Came from</p>
                                <p className="text-sm text-ink line-clamp-1 italic">"{parentThought.text}"</p>
                              </div>
                            </div>
                          )}

                          {linkedInsights.map(insight => (
                            <div key={insight.id} className="flex items-center gap-3 p-3 bg-accent/5 rounded-xl border border-accent/20">
                              <Sunrise size={14} className="text-accent" />
                              <div>
                                <p className="text-[10px] font-bold uppercase text-accent">Derived Insight</p>
                                <p className="text-sm text-ink line-clamp-1">"{insight.insight || insight.text}"</p>
                              </div>
                            </div>
                          ))}

                          {linkedCapsules.map(capsule => (
                            <div key={capsule.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                              <Lock size={14} className="text-ink-muted" />
                              <div>
                                <p className="text-[10px] font-bold uppercase text-ink-muted">Stored for future</p>
                                <p className="text-sm text-ink line-clamp-1">Unlocks {formatDate(capsule.unlock_at!)}</p>
                              </div>
                            </div>
                          ))}

                          {childThoughts.map(child => (
                            <div key={child.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                              <ArrowRight size={14} className="text-accent" />
                              <div>
                                <p className="text-[10px] font-bold uppercase text-accent">Leads to</p>
                                <p className="text-sm text-ink line-clamp-1 italic">"{child.text}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {thoughts.filter(t => t.parent_id || thoughts.some(p => p.parent_id === t.id)).length === 0 && (
                  <div className="py-24 text-center space-y-4">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center text-border mx-auto border-2 border-dashed border-border">
                      <Share2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-ink">No connections yet</h3>
                    <p className="text-ink-muted">Start connecting your thoughts to see the threads of your mind.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="insights" className="space-y-12">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black mb-4 text-ink">Insights</h2>
                <p className="text-ink-muted font-serif italic text-xl">Patterns of your consciousness & wisdom</p>
              </div>

              {/* Wisdom Level Card */}
              <Card className="bg-accent/5 border-accent/20 p-12 text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-[0.4em]">Current Wisdom Level</h3>
                  <div className="text-7xl font-black text-ink tracking-tighter">{wisdomLevel.title}</div>
                  <p className="text-xl text-ink-muted font-serif italic">{wisdomLevel.desc}</p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                    <span>{wisdomScore} Points</span>
                    <span>Next Level: {
                      wisdomScore < 50 ? '50' : 
                      wisdomScore < 150 ? '150' : 
                      wisdomScore < 300 ? '300' : 
                      wisdomScore < 600 ? '600' : '∞'
                    }</span>
                  </div>
                  <div className="h-2 bg-bg rounded-full overflow-hidden border border-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (wisdomScore / (wisdomScore < 50 ? 50 : wisdomScore < 150 ? 150 : wisdomScore < 300 ? 300 : wisdomScore < 600 ? 600 : wisdomScore)) * 100)}%` }}
                      className="h-full bg-accent shadow-[0_0_15px_rgba(196,155,102,0.5)]"
                    />
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mx-auto mb-4">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-3xl font-black text-ink">{thoughts.length}</h4>
                  <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">Total Reflections</p>
                </Card>
                <Card className="text-center p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mx-auto mb-4">
                    <Mic size={24} />
                  </div>
                  <h4 className="text-3xl font-black text-ink">{thoughts.filter(t => t.type === 'voice').length}</h4>
                  <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">Voice Notes</p>
                </Card>
                <Card className="text-center p-8">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border mx-auto mb-4">
                    <Target size={24} />
                  </div>
                  <h4 className="text-3xl font-black text-ink">{purposes.length}</h4>
                  <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">Core Principles</p>
                </Card>
              </div>

              {/* Extracted Insights Section */}
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-ink">Extracted Insights</h3>
                  <p className="text-xs text-ink-muted font-bold uppercase tracking-widest">Wisdom from your guided flows</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {thoughts.filter(t => t.is_insight).map(insight => (
                    <Card key={insight.id} className="p-6 border-accent/30 bg-accent/5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-accent">
                          <Sunrise size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Insight</span>
                        </div>
                        <span className="text-[10px] text-ink-muted">{formatDate(insight.created_at)}</span>
                      </div>
                      <p className="text-lg font-bold text-ink leading-tight">"{insight.insight || insight.text}"</p>
                      {insight.clarity && (
                        <div className="pt-4 border-t border-border/50">
                          <p className="text-[10px] font-bold uppercase text-ink-muted mb-1">Clarity / Next Steps</p>
                          <p className="text-sm text-ink-muted italic">{insight.clarity}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                  {thoughts.filter(t => t.is_insight).length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-3xl bg-surface/30">
                      <p className="text-ink-muted font-serif italic">"No insights extracted yet. Complete a guided flow to find wisdom."</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'book' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="book" className="space-y-8">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-5xl font-black text-ink">Archive</h2>
                  <p className="text-ink-muted font-serif italic text-xl">The complete history of your mind</p>
                </div>
                <Button variant="outline" onClick={() => {
                  const doc = new jsPDF();
                  doc.setFontSize(20);
                  doc.text("Thought Shaastra Archive", 20, 20);
                  doc.setFontSize(12);
                  thoughts.forEach((t, i) => {
                    if (i < 20) { // Limit for demo
                      doc.text(`${formatDate(t.created_at)}: ${t.text.substring(0, 80)}...`, 20, 40 + (i * 10));
                    }
                  });
                  doc.save("archive.pdf");
                }}>
                  <Download size={18} /> Export PDF
                </Button>
              </div>

              <div className="space-y-4">
                {filteredThoughts.map(thought => {
                  const isLocked = thought.unlock_at && isAfter(parseISO(thought.unlock_at), new Date());
                  return (
                    <Card key={thought.id} className={cn("p-6 flex items-center gap-6 hover:bg-surface/80 transition-colors cursor-pointer", isLocked && "opacity-60")} onClick={() => { setEditingThought(thought); setIsWriting(true); }}>
                      <div className="w-16 text-center">
                        <p className="text-[10px] font-black text-ink-muted uppercase">{format(parseISO(thought.created_at), 'MMM')}</p>
                        <p className="text-2xl font-black text-ink">{format(parseISO(thought.created_at), 'dd')}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1 text-ink">{isLocked ? 'Locked Time Capsule' : (thought.title || 'Untitled Thought')}</h4>
                        <p className={cn("text-ink-muted text-sm line-clamp-1", isLocked && "blur-sm select-none")}>
                          {isLocked ? "This thought is sealed in time." : thought.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked && <Lock size={12} className="text-ink-muted" />}
                        {thought.parent_id && <LinkIcon size={12} className="text-accent" />}
                        <span className="text-[10px] font-bold px-2 py-1 bg-surface border border-border rounded-lg text-ink-muted uppercase tracking-widest">
                          {thought.category_name || 'General'}
                        </span>
                        <ChevronRight size={16} className="text-border" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
          {activeTab === 'purpose' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="purpose" className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black mb-4 text-ink">Principles</h2>
                <p className="text-ink-muted font-serif italic text-xl">The core beliefs that guide my journey</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {purposes.map(p => (
                  <Card key={p.id} className="group border-l-4 border-accent p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-2xl font-serif italic leading-relaxed text-ink">"{p.text}"</p>
                        {p.audio_data && <VoicePlayer audioData={p.audio_data} />}
                      </div>
                      <button onClick={async () => { 
                        confirmAction('Delete Principle', 'Remove this principle from your sanctuary?', async () => {
                          await fetch(`/api/purpose/${p.id}`, { method: 'DELETE' }); 
                          fetchData(); 
                          showToast('Principle removed', 'success');
                        });
                      }} className="opacity-0 group-hover:opacity-100 p-2 text-ink-muted hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
                <Card className="bg-surface/50 border-dashed border-2 border-border p-8">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">Add a new principle</h3>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <TextArea 
                        id="new-purpose-text"
                        placeholder="What is a core belief you want to live by?" 
                        className="flex-1"
                      />
                      <div className="flex flex-col gap-2">
                        {isRecording ? (
                          <Button variant="danger" className="h-full px-4" onClick={stopRecording}>
                            <Square size={20} />
                          </Button>
                        ) : (
                          <Button variant="outline" className="h-full px-4" onClick={startRecording}>
                            <Mic size={20} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {audioBlob && (
                      <div className="p-3 bg-accent/10 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-accent">Voice Principle Recorded ({recordingTime}s)</span>
                        <button onClick={resetRecording} className="text-red-500"><Trash2 size={16} /></button>
                      </div>
                    )}

                    <Button className="w-full" onClick={async () => {
                      localStorage.setItem('last_activity_timestamp', Date.now().toString());
                      const input = document.getElementById('new-purpose-text') as HTMLTextAreaElement;
                      const text = input.value;
                      if (text.trim() || audioBlob) {
                        const audio_data = audioBlob ? await blobToBase64(audioBlob) : null;
                        const type = audioBlob ? 'voice' : 'text';
                        
                        if (user) {
                          await fetch('/api/purpose', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ text, type, audio_data }) 
                          });
                        } else {
                          const local = JSON.parse(localStorage.getItem('guest_purpose') || '[]');
                          localStorage.setItem('guest_purpose', JSON.stringify([{ id: Date.now(), text, type, audio_data, created_at: new Date().toISOString() }, ...local]));
                        }
                        input.value = '';
                        resetRecording();
                        fetchData();
                      }
                    }}>Save Principle</Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'questions' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="questions" className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black mb-4 text-ink">Questions</h2>
                <p className="text-ink-muted font-serif italic text-xl">Questions I am currently exploring</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {questions.map(q => (
                  <Card key={q.id} className="group p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-2xl font-serif leading-relaxed text-ink">{q.text}</p>
                        {q.audio_data && <VoicePlayer audioData={q.audio_data} />}
                      </div>
                      <button onClick={async () => { 
                        confirmAction('Delete Question', 'Remove this question from your sanctuary?', async () => {
                          await fetch(`/api/questions/${q.id}`, { method: 'DELETE' }); 
                          fetchData(); 
                          showToast('Question removed', 'success');
                        });
                      }} className="opacity-0 group-hover:opacity-100 p-2 text-ink-muted hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
                <Card className="bg-surface/50 border-dashed border-2 border-border p-8">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">Add a new question</h3>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <TextArea 
                        id="new-question-text"
                        placeholder="What is a big question you're exploring?" 
                        className="flex-1"
                      />
                      <div className="flex flex-col gap-2">
                        {isRecording ? (
                          <Button variant="danger" className="h-full px-4" onClick={stopRecording}>
                            <Square size={20} />
                          </Button>
                        ) : (
                          <Button variant="outline" className="h-full px-4" onClick={startRecording}>
                            <Mic size={20} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {audioBlob && (
                      <div className="p-3 bg-accent/10 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-accent">Voice Question Recorded ({recordingTime}s)</span>
                        <button onClick={resetRecording} className="text-red-500"><Trash2 size={16} /></button>
                      </div>
                    )}

                    <Button className="w-full" onClick={async () => {
                      localStorage.setItem('last_activity_timestamp', Date.now().toString());
                      const input = document.getElementById('new-question-text') as HTMLTextAreaElement;
                      const text = input.value;
                      if (text.trim() || audioBlob) {
                        const audio_data = audioBlob ? await blobToBase64(audioBlob) : null;
                        const type = audioBlob ? 'voice' : 'text';
                        
                        if (user) {
                          await fetch('/api/questions', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ text, type, audio_data }) 
                          });
                        } else {
                          const local = JSON.parse(localStorage.getItem('guest_questions') || '[]');
                          localStorage.setItem('guest_questions', JSON.stringify([{ id: Date.now(), text, type, audio_data, created_at: new Date().toISOString() }, ...local]));
                        }
                        input.value = '';
                        resetRecording();
                        fetchData();
                      }
                    }}>Save Question</Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Disclaimer Footer */}
        <footer className="mt-32 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-surface/20 border-border/30 backdrop-blur-sm p-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-3 text-accent/60">
                <Shield size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Private & Secure Sanctuary</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed max-w-2xl mx-auto">
                Thought Shaastra is a personal thinking system. Your data is stored locally and only backed up if you choose to create an account. 
                <span className="text-ink font-bold"> No Artificial Intelligence is used in the functioning of this app.</span> 
                Your thoughts are yours alone, unanalyzed and private.
              </p>
              <div className="pt-4 text-[9px] text-ink-muted/40 uppercase tracking-widest">
                © {new Date().getFullYear()} Thought Shaastra • Built for the Mind
              </div>
            </Card>
          </div>
        </footer>
      </main>

      {/* Document Editor Modal */}
      <AnimatePresence>
        {isDocumentEditorOpen && activeDocument && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-bg z-[100] flex flex-col"
          >
            <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-bg/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-6">
                <button onClick={() => setIsDocumentEditorOpen(false)} className="p-3 hover:bg-surface rounded-2xl transition-colors text-ink">
                  <X size={24} />
                </button>
                <div className="h-8 w-px bg-border" />
                <div>
                  <h2 className="font-black text-2xl text-ink">{activeDocument.title}</h2>
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.2em]">Last saved {formatTime(activeDocument.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => {
                  const text = activeDocument.sections?.map(s => `${s.title ? `${s.title}\n\n` : ''}${s.content}\n\n`).join('\n');
                  navigator.clipboard.writeText(`# ${activeDocument.title}\n\n${text}`);
                  showToast('Document copied to clipboard', 'success');
                }}>
                  <Share2 size={18} /> Share
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const text = activeDocument.sections?.map(s => `${s.title ? `${s.title}\n\n` : ''}${s.content}\n\n`).join('\n');
                  const blob = new Blob([`${activeDocument.title}\n\n${text}`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeDocument.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
                  a.click();
                }}>
                  <Download size={18} /> Text
                </Button>
                <Button size="sm" onClick={() => setIsDocumentEditorOpen(false)}>Close Editor</Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-24 px-8 space-y-16">
                <div className="space-y-6">
                  <input 
                    className="text-6xl font-black bg-transparent border-none outline-none w-full placeholder:text-border text-ink"
                    value={activeDocument.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setActiveDocument(prev => prev ? { ...prev, title: newTitle } : null);
                      // Auto-save title
                      fetch(`/api/documents/${activeDocument.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...activeDocument, title: newTitle })
                      });
                    }}
                    placeholder="Document Title"
                  />
                  <textarea 
                    className="text-2xl font-serif italic text-ink-muted bg-transparent border-none outline-none w-full resize-none placeholder:text-border"
                    value={activeDocument.description || ''}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      setActiveDocument(prev => prev ? { ...prev, description: newDesc } : null);
                      // Auto-save description
                      fetch(`/api/documents/${activeDocument.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...activeDocument, description: newDesc })
                      });
                    }}
                    placeholder="Optional description or subtitle..."
                    rows={1}
                  />
                </div>

                <div className="space-y-20">
                  {activeDocument.sections?.map((section, idx) => (
                    <div key={section.id} className="group relative space-y-6">
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity absolute -left-16 top-0">
                        <button onClick={() => {
                          confirmAction('Delete Section', 'Remove this section from the document?', () => {
                            fetch(`/api/sections/${section.id}`, { method: 'DELETE' }).then(res => {
                              if (res.ok) {
                                fetch(`/api/documents/${activeDocument.id}`).then(res => res.ok ? res.json() : null).then(data => {
                                  if (data) setActiveDocument(data);
                                });
                                showToast('Section removed', 'success');
                              }
                            });
                          });
                        }} className="p-3 text-border hover:text-red-500">
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <input 
                        className="text-3xl font-bold bg-transparent border-none outline-none w-full placeholder:text-border text-ink"
                        value={section.title || ''}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          const newSections = [...(activeDocument.sections || [])];
                          newSections[idx] = { ...section, title: newTitle };
                          setActiveDocument(prev => prev ? { ...prev, sections: newSections } : null);
                          // Auto-save section
                          fetch(`/api/sections/${section.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...section, title: newTitle })
                          });
                        }}
                        placeholder="Section Title"
                      />
                      <textarea 
                        className="text-xl font-serif leading-relaxed text-ink bg-transparent border-none outline-none w-full resize-none min-h-[100px] placeholder:text-border"
                        value={section.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          const newSections = [...(activeDocument.sections || [])];
                          newSections[idx] = { ...section, content: newContent };
                          setActiveDocument(prev => prev ? { ...prev, sections: newSections } : null);
                          // Auto-save section
                          fetch(`/api/sections/${section.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...section, content: newContent })
                          });
                        }}
                        placeholder="Start writing..."
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      fetch(`/api/documents/${activeDocument.id}/sections`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: '', content: '', order_index: (activeDocument.sections?.length || 0) })
                      }).then(res => {
                        if (res.ok) {
                          fetch(`/api/documents/${activeDocument.id}`).then(res => res.ok ? res.json() : null).then(data => {
                            if (data) setActiveDocument(data);
                          });
                        }
                      });
                    }}
                    className="w-full py-12 border-2 border-dashed border-border rounded-[2rem] text-border hover:text-accent hover:border-accent transition-all flex flex-col items-center gap-4"
                  >
                    <Plus size={32} />
                    <span className="font-bold text-sm uppercase tracking-[0.3em]">Add Section</span>
                  </button>
                </div>

                <div className="pt-24 border-t border-border space-y-10">
                  <h3 className="text-sm font-black text-ink-muted uppercase tracking-[0.4em]">Linked Thoughts</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {activeDocument.linkedThoughts?.map(thought => (
                      <Card key={thought.id} className="p-6 flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-accent border border-border">
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-ink">{thought.title || thought.text.substring(0, 40)}...</p>
                            <p className="text-xs text-ink-muted uppercase tracking-widest font-bold">{formatDate(thought.created_at)}</p>
                          </div>
                        </div>
                        <button onClick={() => {
                          fetch(`/api/documents/${activeDocument.id}/link/${thought.id}`, { method: 'DELETE' }).then(res => {
                            if (res.ok) {
                              fetch(`/api/documents/${activeDocument.id}`).then(res => res.ok ? res.json() : null).then(data => {
                                if (data) setActiveDocument(data);
                              });
                            }
                          });
                        }} className="opacity-0 group-hover:opacity-100 p-3 text-border hover:text-red-500 transition-opacity">
                          <X size={20} />
                        </button>
                      </Card>
                    ))}
                    <Button variant="outline" className="border-dashed py-6" onClick={() => {
                      setIsLinkThoughtModalOpen(true);
                    }}>
                      <LinkIcon size={18} /> Link Existing Thought
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Write Modal */}
      <Modal isOpen={isWriting} onClose={() => { setIsWriting(false); setEditingThought(null); resetRecording(); }} title={editingThought ? "Edit Thought" : "Write a Thought"}>
        <ThoughtEditor 
          editingThought={editingThought}
          categories={categories}
          thoughts={thoughts}
          documents={documents}
          onSave={handleSaveThought}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          resetRecording={resetRecording}
          audioBlob={audioBlob}
          recordingTime={recordingTime}
          blobToBase64={blobToBase64}
          promptAction={promptAction}
        />
      </Modal>

      {/* Create Document Modal */}
      <Modal isOpen={isCreateDocumentModalOpen} onClose={() => setIsCreateDocumentModalOpen(false)} title="Create New Document">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const title = formData.get('title') as string;
          const description = formData.get('description') as string;
          const category_id = formData.get('category_id') as string;
          const templateId = formData.get('template') as string;
          const is_private = 1;

          const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId) || DOCUMENT_TEMPLATES[0];

          const res = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title, 
              description, 
              category_id: category_id ? parseInt(category_id) : null,
              is_private,
              sections: template.sections
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.id) {
              fetchData();
              const docRes = await fetch(`/api/documents/${data.id}`);
              if (docRes.ok) {
                const doc = await docRes.json();
                if (doc) {
                  setActiveDocument(doc);
                  setIsCreateDocumentModalOpen(false);
                  setIsDocumentEditorOpen(true);
                }
              }
            }
          }
        }} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Title</label>
            <Input name="title" placeholder="Document Title" required />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Description</label>
            <TextArea name="description" placeholder="What is this project about?" rows={3} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Category</label>
            <select name="category_id" className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-ink text-sm outline-none focus:border-accent transition-colors">
              <option value="">Uncategorized</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Select Template</label>
            <div className="grid grid-cols-2 gap-4">
              {DOCUMENT_TEMPLATES.map(template => (
                <label key={template.id} className="relative flex flex-col p-6 border border-border rounded-3xl cursor-pointer hover:border-accent transition-all has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                  <input type="radio" name="template" value={template.id} defaultChecked={template.id === 'blank'} className="sr-only" />
                  <div className="text-accent mb-4">{template.icon}</div>
                  <span className="font-bold text-lg text-ink">{template.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full py-4 text-lg">Create Document</Button>
        </form>
      </Modal>

      {/* Auth Modal */}
      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title={authMode === 'login' ? "Welcome Back to Your Sanctuary" : "Secure Your Wisdom"}>
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center text-accent border border-border mx-auto mb-6">
              <Shield size={40} />
            </div>
            <p className="text-ink-muted text-sm leading-relaxed">Protect your thoughts and sync them across all your devices.</p>
          </div>
          
          {authMode === 'register' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Name</label>
              <Input name="name" placeholder="Your Name" required />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Email</label>
            <Input name="email" type="email" placeholder="email@example.com" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Password</label>
            <Input name="password" type="password" placeholder="••••••••" required />
          </div>
          
          <Button type="submit" className="w-full py-4 mt-6">
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          
          <div className="text-center mt-6">
            <button 
              type="button" 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm text-accent hover:underline font-bold"
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Welcome Modal */}
      <Modal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} title="Welcome to Your Thought Sanctuary">
        <div className="text-center space-y-8 py-6">
          <div className="w-24 h-24 bg-accent text-bg rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-accent/40">
            <Flower2 size={48} />
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-ink leading-tight">Capture your wisdom before it fades.</h3>
            <p className="text-ink-muted font-serif italic text-xl">"The unexamined life is not worth living."</p>
          </div>
          <div className="grid grid-cols-1 gap-4 pt-6">
            <Button className="py-5 text-xl" onClick={() => { setIsWelcomeOpen(false); setIsWriting(true); }}>
              Begin Your First Reflection <ArrowRight size={24} className="ml-2" />
            </Button>
            <Button variant="ghost" className="text-ink-muted hover:text-ink" onClick={() => { setIsWelcomeOpen(false); setActiveTab('guide'); }}>
              Explore the Shaastra Way
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isNameModalOpen} onClose={() => {}} title="How shall we address you, Seeker?">
        <form onSubmit={(e) => {
          e.preventDefault();
          const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value;
          if (name) {
            setUserName(name);
            localStorage.setItem('user_name', name);
            setIsNameModalOpen(false);
          }
        }} className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center text-accent border border-border mx-auto mb-6">
              <UserPlus size={40} />
            </div>
            <p className="text-ink-muted text-sm leading-relaxed">We'll use this to personalize your thinking experience.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted ml-1">Your Name</label>
            <Input name="name" placeholder="Enter your name..." required autoFocus />
          </div>
          <Button type="submit" className="w-full py-4 mt-6">Continue</Button>
        </form>
      </Modal>

      {/* Backup Prompt */}
      <AnimatePresence>
        {isBackupPromptOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-8 right-8 lg:left-auto lg:right-8 lg:w-[400px] bg-accent text-bg p-8 rounded-[2.5rem] shadow-2xl z-50"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 bg-bg/20 rounded-2xl">
                <Shield size={28} />
              </div>
              <button onClick={() => { setIsBackupPromptOpen(false); localStorage.setItem('backup_prompt_dismissed', 'true'); }} className="p-2 hover:bg-bg/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <h3 className="text-2xl font-black mb-3">Protect your thoughts.</h3>
            <p className="text-bg/80 text-lg mb-8 leading-relaxed">You've written {thoughts.length} thoughts. Create a free account to safely back them up to the cloud.</p>
            <div className="flex gap-4">
              <Button variant="secondary" className="flex-1 bg-bg text-accent hover:bg-surface border-none py-4 text-lg" onClick={() => { setIsBackupPromptOpen(false); setIsAuthModalOpen(true); }}>
                Create Account
              </Button>
              <Button variant="ghost" className="text-bg hover:bg-bg/10 py-4 text-lg" onClick={() => setIsBackupPromptOpen(false)}>
                Later
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isLinkThoughtModalOpen} onClose={() => setIsLinkThoughtModalOpen(false)} title="Link a Thought">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {thoughts.filter(t => !activeDocument?.linkedThoughts?.some(lt => lt.id === t.id)).map(thought => (
            <Card 
              key={thought.id} 
              className="p-4 cursor-pointer hover:border-accent transition-all flex items-center justify-between group"
              onClick={() => {
                if (activeDocument) {
                  fetch(`/api/documents/${activeDocument.id}/link/${thought.id}`, { method: 'POST' }).then(res => {
                    if (res.ok) {
                      fetch(`/api/documents/${activeDocument.id}`).then(res => res.ok ? res.json() : null).then(data => {
                        if (data) setActiveDocument(data);
                      });
                      setIsLinkThoughtModalOpen(false);
                      showToast('Thought linked', 'success');
                    }
                  });
                }
              }}
            >
              <div className="flex-1">
                <p className="font-bold text-ink truncate">{thought.title || thought.text.substring(0, 50)}...</p>
                <p className="text-[10px] text-ink-muted uppercase tracking-widest">{formatDate(thought.created_at)}</p>
              </div>
              <Plus size={16} className="text-border group-hover:text-accent" />
            </Card>
          ))}
          {thoughts.length === 0 && <p className="text-center py-8 text-ink-muted italic">No thoughts available to link.</p>}
        </div>
      </Modal>

      {/* Global Systems */}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
        ))}
      </AnimatePresence>

      {confirmConfig && (
        <ConfirmDialog 
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}

      {promptConfig && (
        <PromptDialog 
          isOpen={promptConfig.isOpen}
          title={promptConfig.title}
          message={promptConfig.message}
          placeholder={promptConfig.placeholder}
          onConfirm={promptConfig.onConfirm}
          onCancel={() => setPromptConfig(null)}
        />
      )}
    </div>
  );
}

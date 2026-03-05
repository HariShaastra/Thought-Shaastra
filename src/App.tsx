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
  Sparkles,
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
  Menu
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

const useVoiceRecorder = () => {
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
      
      alert(message);
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

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="relative w-10 h-10 flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border border-dashed border-indigo-500/20 rounded-full"
      />
      <motion.div 
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-500 dark:to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"
      >
        <BookOpen size={16} className="text-white" />
      </motion.div>
    </div>
    <div className="flex flex-col">
      <h1 className="text-lg font-black tracking-tighter leading-none bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
        Thought
      </h1>
      <span className="text-[9px] font-serif italic text-indigo-500 dark:text-indigo-400 tracking-[0.3em] uppercase leading-none mt-1">
        Shaastra
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
    primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200',
    secondary: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300',
    outline: 'border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-900',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50',
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
      'w-full px-4 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:focus:ring-slate-700',
      className
    )}
    {...props}
  />
);

const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea 
    className={cn(
      'w-full px-4 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:focus:ring-slate-700 min-h-[120px] resize-none',
      className
    )}
    {...props}
  />
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm', className)} {...props}>
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
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
    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center gap-4">
      <button 
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20"
      >
        {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        {isPlaying && <motion.div animate={{ width: ['0%', '100%'] }} transition={{ duration: 5, repeat: Infinity }} className="h-full bg-indigo-500" />}
      </div>
      <span className="text-[10px] font-mono text-slate-400">Voice Note</span>
    </div>
  );
};

const DOCUMENT_TEMPLATES = [
  { id: 'blank', name: 'Blank Document', icon: <BookOpen size={16} />, sections: [{ title: 'Introduction', content: '' }] },
  { id: 'essay', name: 'Essay', icon: <Edit3 size={16} />, sections: [{ title: 'Introduction', content: '' }, { title: 'Body Paragraph 1', content: '' }, { title: 'Body Paragraph 2', content: '' }, { title: 'Conclusion', content: '' }] },
  { id: 'research', name: 'Research Notes', icon: <Search size={16} />, sections: [{ title: 'Abstract', content: '' }, { title: 'Literature Review', content: '' }, { title: 'Methodology', content: '' }, { title: 'Findings', content: '' }] },
  { id: 'life-plan', name: 'Life Plan', icon: <Target size={16} />, sections: [{ title: 'Vision', content: '' }, { title: 'Short-term Goals', content: '' }, { title: 'Long-term Goals', content: '' }, { title: 'Action Steps', content: '' }] },
];

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isBackupPromptOpen, setIsBackupPromptOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navHistory, setNavHistory] = useState<string[]>(['home']);
  const [capsules, setCapsules] = useState<Thought[]>([]);
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [isDocumentEditorOpen, setIsDocumentEditorOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);

  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [editingPurposeId, setEditingPurposeId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording, blobToBase64 } = useVoiceRecorder();

  const changeTab = (tabId: string) => {
    if (tabId !== activeTab) {
      setNavHistory(prev => [...prev, tabId]);
      setActiveTab(tabId);
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
      const [thoughtsRes, categoriesRes, purposeRes, statsRes, questionsRes, userRes, capsulesRes, activityRes, docsRes] = await Promise.all([
        fetch('/api/thoughts'),
        fetch('/api/categories'),
        fetch('/api/purpose'),
        fetch('/api/stats'),
        fetch('/api/questions'),
        fetch('/api/auth/me'),
        fetch('/api/time-capsules'),
        fetch('/api/insights/activity'),
        fetch('/api/documents')
      ]);
      
      if (userRes.ok) setUser(await userRes.json());
      
      const serverThoughts = await thoughtsRes.json();
      const localThoughts = JSON.parse(localStorage.getItem('guest_thoughts') || '[]');
      setThoughts([...serverThoughts, ...localThoughts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      setCategories(await categoriesRes.json());
      setPurposes(await purposeRes.json());
      setStats(await statsRes.json());
      setQuestions(await questionsRes.json());
      setCapsules(await capsulesRes.json());
      setActivityData(await activityRes.json());
      setDocuments(await docsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to local storage if offline or server error
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
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
    const payload = {
      ...thoughtData,
      unlock_at: thoughtData.unlock_at ? new Date(thoughtData.unlock_at).toISOString() : null,
      is_private: parseInt(thoughtData.is_private) || 0
    };

    if (user) {
      const res = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const savedThought = await res.json();
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
        fetchData();
        setIsWriting(false);
        setEditingThought(null);
      }
    } else {
      const newThought = {
        ...payload,
        id: Date.now(),
        created_at: new Date().toISOString(),
        category_name: categories.find(c => c.id === parseInt(payload.category_id))?.name || 'Uncategorized'
      };
      const local = JSON.parse(localStorage.getItem('guest_thoughts') || '[]');
      localStorage.setItem('guest_thoughts', JSON.stringify([newThought, ...local]));
      
      if (payload.parent_id) {
        const localConnections = JSON.parse(localStorage.getItem('guest_connections') || '[]');
        localStorage.setItem('guest_connections', JSON.stringify([{ id: Date.now(), thought_a_id: payload.parent_id, thought_b_id: newThought.id }, ...localConnections]));
      }
      
      fetchData();
      setIsWriting(false);
      setEditingThought(null);
    }
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
      setUser(userData);
      setIsAuthModalOpen(false);
      handleSync();
    } else {
      alert('Authentication failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    fetchData();
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

  const thoughtOfTheDay = useMemo(() => {
    if (thoughts.length === 0) return null;
    const seed = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return thoughts[Math.abs(hash) % thoughts.length];
  }, [thoughts]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar / Desktop Nav */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col p-6 z-40">
        <Logo />
        <nav className="mt-12 flex-1 space-y-2">
          {[
            { id: 'home', icon: Clock, label: 'Timeline' },
            { id: 'documents', icon: BookOpen, label: 'Documents' },
            { id: 'categories', icon: Hash, label: 'Categories' },
            { id: 'purpose', icon: Target, label: 'Principles' },
            { id: 'questions', icon: HelpCircle, label: 'Questions' },
            { id: 'capsule', icon: Lock, label: 'Capsules' },
            { id: 'graph', icon: BarChart3, label: 'Insights' },
            { id: 'book', icon: BookOpen, label: 'Archive' },
            { id: 'guide', icon: Info, label: 'Guide' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative',
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <tab.icon size={20} />
              <span className="font-semibold">{tab.label}</span>
              {tab.id === 'capsule' && unlockedCapsulesCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-semibold">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          {user ? (
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name || user.email}</p>
                <button onClick={handleLogout} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1">
                  <LogOut size={10} /> Logout
                </button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setIsAuthModalOpen(true)}>
              <Cloud size={18} /> Backup Thoughts
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          {navHistory.length > 1 && (
            <button onClick={goBack} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <ArrowRight size={20} className="rotate-180" />
            </button>
          )}
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-0 top-16 bg-white dark:bg-slate-900 z-30 p-6"
          >
            <nav className="grid grid-cols-2 gap-4">
              {[
                { id: 'home', icon: Clock, label: 'Timeline' },
                { id: 'documents', icon: BookOpen, label: 'Documents' },
                { id: 'categories', icon: Hash, label: 'Categories' },
                { id: 'purpose', icon: Target, label: 'Principles' },
                { id: 'questions', icon: HelpCircle, label: 'Questions' },
                { id: 'capsule', icon: Lock, label: 'Capsules' },
                { id: 'graph', icon: BarChart3, label: 'Insights' },
                { id: 'book', icon: BookOpen, label: 'Archive' },
                { id: 'guide', icon: Info, label: 'Guide' },
                { id: 'settings', icon: Settings, label: 'Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { changeTab(tab.id); setIsMobileMenuOpen(false); }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                    activeTab === tab.id 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800' 
                      : 'border-slate-100 dark:border-slate-800 text-slate-500'
                  )}
                >
                  <tab.icon size={24} />
                  <span className="text-xs font-bold">{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-8">
              {user ? (
                <Button variant="danger" className="w-full" onClick={handleLogout}>Logout</Button>
              ) : (
                <Button variant="primary" className="w-full" onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}>
                  Sign In for Backup
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="lg:ml-64 pt-24 lg:pt-12 pb-32 px-4 lg:px-12 max-w-5xl mx-auto">
        {/* Desktop Back Button */}
        <div className="hidden lg:flex mb-6">
          {navHistory.length > 1 && (
            <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-sm">
              <ArrowRight size={16} className="rotate-180" /> Back to Previous
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          {activeTab === 'documents' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="documents" className="space-y-8">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-4xl font-black">Documents</h2>
                  <p className="text-slate-500 font-serif italic text-xl">Long-form explorations of your mind</p>
                </div>
                <Button className="h-12 px-6 rounded-xl shadow-lg shadow-indigo-600/20" onClick={() => setIsCreateDocumentModalOpen(true)}>
                  <Plus size={20} /> Create Document
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.map(doc => (
                  <Card key={doc.id} className="group hover:border-indigo-500 transition-all cursor-pointer" onClick={() => {
                    fetch(`/api/documents/${doc.id}`).then(res => res.json()).then(data => {
                      setActiveDocument(data);
                      setIsDocumentEditorOpen(true);
                    });
                  }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <BookOpen size={20} />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete document?')) {
                            fetch(`/api/documents/${doc.id}`, { method: 'DELETE' }).then(() => fetchData());
                          }
                        }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{doc.title}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                      Last edited {formatDate(doc.updated_at)}
                    </p>
                    {doc.description && <p className="mt-4 text-slate-500 text-sm line-clamp-2 italic">"{doc.description}"</p>}
                  </Card>
                ))}
                {documents.length === 0 && (
                  <div className="md:col-span-2 py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                      <BookOpen size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">No documents yet</h3>
                      <p className="text-slate-500">Start a long-form writing project to organize your thoughts.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="categories" className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-4">Categories</h2>
                <p className="text-slate-500 font-serif italic text-xl">The taxonomy of your mind</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(category => {
                  const thoughtCount = thoughts.filter(t => t.category_id === category.id).length;
                  return (
                    <Card key={category.id} className="group hover:border-indigo-500 transition-all cursor-pointer" onClick={() => {
                      setSearchQuery(category.name);
                      changeTab('home');
                    }}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Hash size={20} />
                        </div>
                        <span className="text-2xl font-black text-slate-200 dark:text-slate-800">{thoughtCount}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Reflections</p>
                    </Card>
                  );
                })}
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center">
                  <Plus size={32} className="text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold mb-4">New Category</h3>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="home" className="space-y-8">
              {/* Search Results for Documents */}
              {searchQuery && filteredDocuments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Documents ({filteredDocuments.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDocuments.map(doc => (
                      <Card key={doc.id} className="p-4 hover:border-indigo-500 transition-all cursor-pointer" onClick={() => {
                        fetch(`/api/documents/${doc.id}`).then(res => res.json()).then(data => {
                          setActiveDocument(data);
                          setIsDocumentEditorOpen(true);
                        });
                      }}>
                        <div className="flex items-center gap-3">
                          <BookOpen size={16} className="text-indigo-500" />
                          <h4 className="font-bold text-sm">{doc.title}</h4>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Hero Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-indigo-600 text-white border-none">
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Current Streak</p>
                  <h3 className="text-4xl font-black">{streak} Days</h3>
                  <p className="text-indigo-200 text-[10px] mt-2">Consistent reflection builds wisdom.</p>
                </Card>
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Thoughts</p>
                  <h3 className="text-4xl font-black">{thoughts.length}</h3>
                  <div className="mt-2 flex items-center gap-1 text-emerald-500 text-xs font-bold">
                    <Sparkles size={12} /> {thoughts.filter(t => t.type === 'voice').length} Voice Notes
                  </div>
                </Card>
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Wisdom Score</p>
                  <h3 className="text-4xl font-black">{Math.round(thoughts.length * 1.5 + purposes.length * 5)}</h3>
                  <p className="text-slate-400 text-[10px] mt-2">Based on depth of reflection.</p>
                </Card>
              </div>

              {/* Search & Write */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <Input 
                    placeholder="Search your mind's archive..." 
                    className="pl-12 h-14 rounded-2xl text-lg border-slate-200 dark:border-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button className="h-14 px-8 rounded-2xl text-lg shadow-xl shadow-indigo-600/20" onClick={() => setIsWriting(true)}>
                  <Plus size={24} /> Write Thought
                </Button>
              </div>

              {/* Thought of the Day */}
              {thoughtOfTheDay && !searchQuery && (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10 border-indigo-100 dark:border-indigo-800/30 p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles size={120} />
                    </div>
                    <Sparkles className="mx-auto mb-6 text-amber-500" size={32} />
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] mb-8">Thought of the Day</h3>
                    <p className="text-3xl font-serif leading-relaxed text-slate-800 dark:text-slate-200 italic">
                      "{thoughtOfTheDay.text}"
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-4 text-xs text-slate-400">
                      <span>{formatDate(thoughtOfTheDay.created_at)}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{thoughtOfTheDay.category_name || 'Uncategorized'}</span>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Timeline */}
              <div className="space-y-12 pt-8">
                {(Object.entries(groupedThoughts) as [string, Thought[]][]).map(([monthYear, monthThoughts]) => (
                  <div key={monthYear} className="relative">
                    <div className="sticky top-20 lg:top-4 z-10 py-2 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
                      <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
                        {monthYear}
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      {monthThoughts.map(thought => (
                        <motion.div key={thought.id} layoutId={`thought-${thought.id}`}>
                          <Card className="group hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 border-slate-200/50 dark:border-slate-800/50">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                  {thought.category_name || 'General'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">{formatTime(thought.created_at)}</span>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingThought(thought); setIsWriting(true); }} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(thought.text); alert('Copied'); }} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg">
                                  <Share2 size={14} />
                                </button>
                              </div>
                            </div>
                            {thought.title && <h4 className="text-lg font-bold mb-2">{thought.title}</h4>}
                            <p className="text-lg font-serif leading-relaxed text-slate-700 dark:text-slate-300">
                              {thought.text}
                            </p>
                            {thought.type === 'voice' && thought.audio_data && (
                              <VoicePlayer audioData={thought.audio_data} />
                            )}
                            {thought.tags && (
                              <div className="mt-6 flex flex-wrap gap-2">
                                {(thought.tags as string).split(',').map(tag => (
                                  <span key={tag} className="text-[10px] font-bold text-indigo-500/60 dark:text-indigo-400/60 uppercase tracking-widest">#{tag.trim()}</span>
                                ))}
                              </div>
                            )}
                            {thought.parent_id && (
                              <button 
                                onClick={() => {
                                  const parent = thoughts.find(p => p.id === thought.parent_id);
                                  if (parent) {
                                    setEditingThought(parent);
                                    setIsWriting(true);
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest mt-4"
                              >
                                <LinkIcon size={12} /> Linked to Thought
                              </button>
                            )}
                          </Card>
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
                <h2 className="text-4xl font-black mb-4">How to use Thought Shaastra</h2>
                <p className="text-slate-500 text-xl font-serif italic">A guide to your digital sanctuary</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                    <Edit3 size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Capture Thoughts</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Write down anything that comes to mind. Use the voice feature if you're on the move. Categorize them to keep your mind organized.
                  </p>
                </Card>
                <Card className="p-8">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Time Capsules</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Write a message to your future self and set an unlock date. The thought will remain sealed until that specific moment in time.
                  </p>
                </Card>
                <Card className="p-8">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                    <Target size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Principles & Questions</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Define your core values in the Principles section. Keep track of the big questions you're currently exploring in the Questions tab.
                  </p>
                </Card>
                <Card className="p-8">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 mb-6">
                    <Cloud size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Optional Backup</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Your thoughts are stored locally by default. Create an account to safely back them up to our secure cloud and sync across all your devices.
                  </p>
                </Card>
              </div>

              <Card className="p-10 bg-slate-900 text-white border-none text-center">
                <h3 className="text-2xl font-bold mb-4">Philosophy of Thought Shaastra</h3>
                <p className="text-slate-400 font-serif italic text-lg leading-relaxed max-w-xl mx-auto">
                  "This is not a social network. It is a personal sanctuary. No likes, no comments, no distractions. Just you and your thoughts, preserved forever."
                </p>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="settings" className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl font-black">Account Settings</h2>
              
              <Card className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Backup Status</h3>
                    <p className="text-xs text-slate-500">{user ? 'Your thoughts are safely backed up to the cloud.' : 'Thoughts are currently stored locally on this device.'}</p>
                  </div>
                  {user ? (
                    <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                      <Check size={16} /> Synced
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setIsAuthModalOpen(true)}>Enable Backup</Button>
                  )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Export Data</h3>
                    <p className="text-xs text-slate-500">Download your entire thought archive.</p>
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

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Theme</h3>
                    <p className="text-xs text-slate-500">Switch between light and dark mode.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsDarkMode(!isDarkMode)}>
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />} {isDarkMode ? 'Light' : 'Dark'}
                  </Button>
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
                        if (confirm('Are you absolutely sure? This cannot be undone.')) {
                          await fetch('/api/auth/account', { method: 'DELETE' });
                          setUser(null);
                          fetchData();
                        }
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
                <h2 className="text-4xl font-black mb-4">Time Capsules</h2>
                <p className="text-slate-500 font-serif italic text-xl">Messages to your future self</p>
                {unlockedCapsulesCount > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-sm font-bold animate-bounce">
                    <Sparkles size={16} /> {unlockedCapsulesCount} Capsules Unlocked!
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {thoughts.filter(t => t.unlock_at).map(capsule => {
                  const isLocked = isAfter(parseISO(capsule.unlock_at!), new Date());
                  return (
                    <Card key={capsule.id} className={cn("relative overflow-hidden group", isLocked ? "opacity-75 grayscale" : "border-indigo-200")}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          {isLocked ? <Lock size={16} className="text-slate-400" /> : <Unlock size={16} className="text-indigo-500" />}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {isLocked ? `Unlocks ${formatDate(capsule.unlock_at!)}` : `Unlocked ${formatDate(capsule.unlock_at!)}`}
                          </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingThought(capsule); setIsWriting(true); }} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className={cn("text-lg font-serif leading-relaxed", isLocked ? "blur-sm select-none" : "text-slate-700 dark:text-slate-300")}>
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
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest mt-4"
                        >
                          <LinkIcon size={12} /> Linked to Thought
                        </button>
                      )}
                    </Card>
                  );
                })}
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-12 text-center">
                  <Lock size={48} className="text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Create a Time Capsule</h3>
                  <p className="text-slate-500 text-sm mb-6">Seal a thought today to be opened in the future.</p>
                  <Button onClick={() => setIsWriting(true)}>
                    <Plus size={20} /> New Capsule
                  </Button>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'graph' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="graph" className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-4">Insights</h2>
                <p className="text-slate-500 font-serif italic text-xl">Patterns of your consciousness</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="h-[400px] flex flex-col">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Thought Frequency</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#4f46e5" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#4f46e5' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="h-[400px] flex flex-col">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Category Distribution</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {stats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-2xl font-black">{thoughts.length}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total Reflections</p>
                </Card>
                <Card className="text-center">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                    <Mic size={24} />
                  </div>
                  <h4 className="text-2xl font-black">{thoughts.filter(t => t.type === 'voice').length}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Voice Notes</p>
                </Card>
                <Card className="text-center">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-4">
                    <Target size={24} />
                  </div>
                  <h4 className="text-2xl font-black">{purposes.length}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Core Principles</p>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'book' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="book" className="space-y-8">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-4xl font-black">Archive</h2>
                  <p className="text-slate-500 font-serif italic text-xl">The complete history of your mind</p>
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
                    <Card key={thought.id} className={cn("p-4 flex items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer", isLocked && "opacity-60")} onClick={() => { setEditingThought(thought); setIsWriting(true); }}>
                      <div className="w-16 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase">{format(parseISO(thought.created_at), 'MMM')}</p>
                        <p className="text-xl font-black">{format(parseISO(thought.created_at), 'dd')}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">{isLocked ? 'Locked Time Capsule' : (thought.title || 'Untitled Thought')}</h4>
                        <p className={cn("text-slate-500 text-sm line-clamp-1", isLocked && "blur-sm select-none")}>
                          {isLocked ? "This thought is sealed in time." : thought.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked && <Lock size={12} className="text-slate-400" />}
                        {thought.parent_id && <LinkIcon size={12} className="text-indigo-500" />}
                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 uppercase tracking-widest">
                          {thought.category_name || 'General'}
                        </span>
                        <ChevronRight size={16} className="text-slate-300" />
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
                <h2 className="text-4xl font-black mb-4">Principles</h2>
                <p className="text-slate-500 font-serif italic text-xl">The core beliefs that guide my journey</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {purposes.map(p => (
                  <Card key={p.id} className="group border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xl font-serif italic leading-relaxed">"{p.text}"</p>
                        {p.audio_data && <VoicePlayer audioData={p.audio_data} />}
                      </div>
                      <button onClick={async () => { if (confirm('Delete?')) { await fetch(`/api/purpose/${p.id}`, { method: 'DELETE' }); fetchData(); } }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Add a new principle</h3>
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
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600">Voice Principle Recorded ({recordingTime}s)</span>
                        <button onClick={resetRecording} className="text-red-500"><Trash2 size={16} /></button>
                      </div>
                    )}

                    <Button className="w-full" onClick={async () => {
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
                <h2 className="text-4xl font-black mb-4">Questions</h2>
                <p className="text-slate-500 font-serif italic text-xl">Questions I am currently exploring</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {questions.map(q => (
                  <Card key={q.id} className="group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xl font-serif leading-relaxed">{q.text}</p>
                        {q.audio_data && <VoicePlayer audioData={q.audio_data} />}
                      </div>
                      <button onClick={async () => { if (confirm('Delete?')) { await fetch(`/api/questions/${q.id}`, { method: 'DELETE' }); fetchData(); } }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Add a new question</h3>
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
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600">Voice Question Recorded ({recordingTime}s)</span>
                        <button onClick={resetRecording} className="text-red-500"><Trash2 size={16} /></button>
                      </div>
                    )}

                    <Button className="w-full" onClick={async () => {
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
      </main>

      {/* Floating Action Button (Mobile) */}
      <div className="lg:hidden fixed bottom-8 right-8 z-40">
        <button 
          onClick={() => setIsWriting(true)}
          className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* Document Editor Modal */}
      <AnimatePresence>
        {isDocumentEditorOpen && activeDocument && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col"
          >
            <header className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsDocumentEditorOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <h2 className="font-black text-lg">{activeDocument.title}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last saved {formatTime(activeDocument.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => {
                  const text = activeDocument.sections?.map(s => `${s.title ? `${s.title}\n\n` : ''}${s.content}\n\n`).join('\n');
                  navigator.clipboard.writeText(`# ${activeDocument.title}\n\n${text}`);
                  alert('Document copied to clipboard!');
                }}>
                  <Share2 size={16} /> Share
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
                  <Download size={16} /> Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const text = activeDocument.sections?.map(s => `${s.title ? `## ${s.title}\n\n` : ''}${s.content}\n\n`).join('---\n\n');
                  const blob = new Blob([`# ${activeDocument.title}\n\n${text}`], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeDocument.title.toLowerCase().replace(/\s+/g, '-')}.md`;
                  a.click();
                }}>
                  <Download size={16} /> MD
                </Button>
                <Button size="sm" onClick={() => setIsDocumentEditorOpen(false)}>Close Editor</Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-20 px-6 space-y-12">
                <div className="space-y-4">
                  <input 
                    className="text-5xl font-black bg-transparent border-none outline-none w-full placeholder:text-slate-200 dark:placeholder:text-slate-800"
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
                    className="text-xl font-serif italic text-slate-500 bg-transparent border-none outline-none w-full resize-none placeholder:text-slate-200 dark:placeholder:text-slate-800"
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

                <div className="space-y-16">
                  {activeDocument.sections?.map((section, idx) => (
                    <div key={section.id} className="group relative space-y-4">
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity absolute -left-12 top-0">
                        <button onClick={() => {
                          if (confirm('Delete section?')) {
                            fetch(`/api/sections/${section.id}`, { method: 'DELETE' }).then(() => {
                              fetch(`/api/documents/${activeDocument.id}`).then(res => res.json()).then(data => setActiveDocument(data));
                            });
                          }
                        }} className="p-2 text-slate-300 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <input 
                        className="text-2xl font-bold bg-transparent border-none outline-none w-full placeholder:text-slate-200 dark:placeholder:text-slate-800"
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
                        className="text-lg font-serif leading-relaxed text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none w-full resize-none min-h-[100px] placeholder:text-slate-200 dark:placeholder:text-slate-800"
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
                      }).then(() => {
                        fetch(`/api/documents/${activeDocument.id}`).then(res => res.json()).then(data => setActiveDocument(data));
                      });
                    }}
                    className="w-full py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-300 hover:text-indigo-500 hover:border-indigo-200 transition-all flex flex-col items-center gap-2"
                  >
                    <Plus size={24} />
                    <span className="font-bold text-sm uppercase tracking-widest">Add Section</span>
                  </button>
                </div>

                <div className="pt-20 border-t border-slate-100 dark:border-slate-800 space-y-8">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Linked Thoughts</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {activeDocument.linkedThoughts?.map(thought => (
                      <Card key={thought.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{thought.title || thought.text.substring(0, 40)}...</p>
                            <p className="text-[10px] text-slate-400">{formatDate(thought.created_at)}</p>
                          </div>
                        </div>
                        <button onClick={() => {
                          fetch(`/api/documents/${activeDocument.id}/link/${thought.id}`, { method: 'DELETE' }).then(() => {
                            fetch(`/api/documents/${activeDocument.id}`).then(res => res.json()).then(data => setActiveDocument(data));
                          });
                        }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-opacity">
                          <X size={16} />
                        </button>
                      </Card>
                    ))}
                    <Button variant="outline" className="border-dashed" onClick={() => {
                      // Simple prompt for linking existing thoughts for now
                      const thoughtId = prompt('Enter Thought ID to link (or select from list in future):');
                      if (thoughtId) {
                        fetch(`/api/documents/${activeDocument.id}/link/${thoughtId}`, { method: 'POST' }).then(() => {
                          fetch(`/api/documents/${activeDocument.id}`).then(res => res.json()).then(data => setActiveDocument(data));
                        });
                      }
                    }}>
                      <LinkIcon size={16} /> Link Existing Thought
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
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = Object.fromEntries(formData.entries());
          handleSaveThought({
            ...data,
            type: audioBlob ? 'voice' : 'text',
            audio_data: audioBlob ? (e.currentTarget as any).audio_base64.value : null
          });
        }} className="space-y-4">
          <Input name="title" placeholder="Title (Optional)" defaultValue={editingThought?.title || ''} />
          <div className="relative">
            <TextArea name="text" placeholder="What's on your mind?" required defaultValue={editingThought?.text || ''} />
            <div className="absolute bottom-3 right-3 flex gap-2">
              {isRecording ? (
                <button type="button" onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-lg animate-pulse">
                  <Square size={16} />
                </button>
              ) : (
                <button type="button" onClick={startRecording} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200">
                  <Mic size={16} />
                </button>
              )}
            </div>
          </div>

          {audioBlob && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-bold text-indigo-600">Voice Note Recorded ({recordingTime}s)</span>
              </div>
              <button type="button" onClick={resetRecording} className="text-red-500 hover:text-red-600">
                <Trash2 size={16} />
              </button>
              <input type="hidden" name="audio_base64" id="audio_base64" />
              {/* Convert blob to base64 and set to hidden input */}
              {blobToBase64(audioBlob).then(b64 => {
                const input = document.getElementById('audio_base64') as HTMLInputElement;
                if (input) input.value = b64;
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
              <select name="category_id" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm" defaultValue={editingThought?.category_id || ''}>
                <option value="">Uncategorized</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Unlock Date (Capsule)</label>
              <Input name="unlock_at" type="date" defaultValue={editingThought?.unlock_at ? format(parseISO(editingThought.unlock_at), 'yyyy-MM-dd') : ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Tags</label>
              <Input name="tags" placeholder="philosophy, ideas" defaultValue={editingThought?.tags || ''} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Privacy</label>
              <select name="is_private" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm" defaultValue={editingThought?.is_private || 0}>
                <option value={0}>Public</option>
                <option value={1}>Private</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Link to Thought</label>
            <select name="parent_id" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm" defaultValue={editingThought?.parent_id || ''}>
              <option value="">None</option>
              {thoughts.filter(t => t.id !== editingThought?.id).map(t => (
                <option key={t.id} value={t.id}>{t.title || t.text.substring(0, 30)}...</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Link to Document</label>
            <select name="document_id" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm">
              <option value="">None</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full py-3 text-lg">Save Thought</Button>
          </div>
        </form>
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
          const is_private = formData.get('is_private') === '1';

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
            fetchData();
            const docRes = await fetch(`/api/documents/${data.id}`);
            const doc = await docRes.json();
            setActiveDocument(doc);
            setIsCreateDocumentModalOpen(false);
            setIsDocumentEditorOpen(true);
          }
        }} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title</label>
            <Input name="title" placeholder="Document Title" required />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <TextArea name="description" placeholder="What is this project about?" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
              <select name="category_id" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm">
                <option value="">Uncategorized</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Privacy</label>
              <select name="is_private" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm">
                <option value="1">Private</option>
                <option value="0">Public</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Select Template</label>
            <div className="grid grid-cols-2 gap-3">
              {DOCUMENT_TEMPLATES.map(template => (
                <label key={template.id} className="relative flex flex-col p-4 border rounded-xl cursor-pointer hover:border-indigo-500 transition-all has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20">
                  <input type="radio" name="template" value={template.id} defaultChecked={template.id === 'blank'} className="sr-only" />
                  <div className="text-indigo-600 mb-2">{template.icon}</div>
                  <span className="font-bold text-sm">{template.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full py-3 text-lg">Create Document</Button>
        </form>
      </Modal>

      {/* Auth Modal */}
      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title={authMode === 'login' ? "Welcome Back" : "Create Backup Account"}>
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
              <Shield size={32} />
            </div>
            <p className="text-slate-500 text-sm">Protect your thoughts and sync them across all your devices.</p>
          </div>
          
          {authMode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 ml-1">Name</label>
              <Input name="name" placeholder="Your Name" required />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">Email</label>
            <Input name="email" type="email" placeholder="email@example.com" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1">Password</label>
            <Input name="password" type="password" placeholder="••••••••" required />
          </div>
          
          <Button type="submit" className="w-full py-3 mt-4">
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm text-indigo-600 hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Welcome Modal */}
      <Modal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} title="Welcome to Thought Shaastra">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40">
            <Sparkles size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-2">Capture your thoughts before they disappear.</h3>
            <p className="text-slate-500 font-serif italic">A digital sanctuary for your mind.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button className="py-4 text-lg" onClick={() => { setIsWelcomeOpen(false); setIsWriting(true); }}>
              Write Your First Thought <ArrowRight size={20} />
            </Button>
            <Button variant="ghost" onClick={() => { setIsWelcomeOpen(false); setActiveTab('guide'); }}>
              Learn How It Works
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backup Prompt */}
      <AnimatePresence>
        {isBackupPromptOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-96 bg-indigo-600 text-white p-6 rounded-3xl shadow-2xl z-50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Shield size={24} />
              </div>
              <button onClick={() => { setIsBackupPromptOpen(false); localStorage.setItem('backup_prompt_dismissed', 'true'); }} className="p-1 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold mb-2">Protect your thoughts.</h3>
            <p className="text-indigo-100 text-sm mb-6">You've written {thoughts.length} thoughts. Create a free account to safely back them up to the cloud.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 bg-white text-indigo-600 hover:bg-indigo-50" onClick={() => { setIsBackupPromptOpen(false); setIsAuthModalOpen(true); }}>
                Create Account
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setIsBackupPromptOpen(false)}>
                Later
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

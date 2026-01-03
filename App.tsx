
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Database, 
  User, 
  Plus, 
  Send, 
  FileText, 
  Trash2, 
  ChevronRight,
  Menu,
  X,
  Sparkles,
  BarChart3,
  Loader2,
  Search,
  Activity,
  ArrowUpRight,
  FileCode,
  Zap,
  UploadCloud,
  Paperclip,
  RefreshCw,
  PieChart as PieIcon,
  TrendingUp,
  Maximize2,
  AlertTriangle,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { AppState, Message, UploadedFile, ScheduledTask, UserProfile, VisualizationData } from './types';
import { MockBackend } from './services/mockBackend';
import { buildContext } from './services/contextEngine';
import { queryAI } from './services/geminiService';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
const SUPPORTED_EXTENSIONS = ['.csv', '.txt', '.json', '.md', '.pdf', '.doc', '.docx', '.xlsx', '.xlsm', '.xls', '.ppt', '.pptx'];

/**
 * REUSABLE CHART RENDERER
 */
const ChartRenderer: React.FC<{ viz: VisualizationData; height?: string | number; isMaximized?: boolean }> = ({ viz, height = "100%", isMaximized = false }) => {
  const renderChart = () => {
    switch (viz.type) {
      case 'bar':
        return (
          <BarChart data={viz.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={viz.xAxisKey} tick={{fill: '#64748b', fontSize: isMaximized ? 12 : 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill: '#64748b', fontSize: isMaximized ? 12 : 10}} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey={viz.yAxisKey || 'value'} fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={viz.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={viz.xAxisKey} tick={{fill: '#64748b', fontSize: isMaximized ? 12 : 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill: '#64748b', fontSize: isMaximized ? 12 : 10}} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
            />
            <Line type="monotone" dataKey={viz.yAxisKey || 'value'} stroke="#a855f7" strokeWidth={isMaximized ? 4 : 2} dot={{ fill: '#a855f7', strokeWidth: 2, r: isMaximized ? 4 : 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={viz.data}
              cx="50%"
              cy="50%"
              innerRadius={isMaximized ? "60%" : 40}
              outerRadius={isMaximized ? "80%" : 60}
              paddingAngle={5}
              dataKey={viz.yAxisKey || 'value'}
              stroke="none"
            >
              {viz.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: isMaximized ? '12px' : '10px' }} />
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {renderChart()}
    </ResponsiveContainer>
  );
};

/**
 * SMALL VISUALIZER COMPONENT
 */
const Visualizer: React.FC<{ viz: VisualizationData; onMaximize: (viz: VisualizationData) => void }> = ({ viz, onMaximize }) => {
  return (
    <div className="w-full h-64 sm:h-80 bg-[#0f172a]/50 border border-white/5 rounded-2xl p-4 mt-4 animate-in zoom-in-95 duration-500 overflow-hidden relative">
      <div className="absolute top-4 left-6 flex items-center gap-2 z-10">
         <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viz.title}</h4>
      </div>
      <div className="absolute top-4 right-4 z-10">
         <button 
           onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             onMaximize(viz);
           }} 
           className="p-2 hover:bg-white/10 bg-white/5 rounded-lg text-slate-300 transition-all border border-white/10 flex items-center justify-center"
           title="Maximize Chart"
         >
            <Maximize2 size={16} />
         </button>
      </div>
      <div className="w-full h-full pt-8">
        <ChartRenderer viz={viz} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    profile: { name: '', role: '', preferences: '' },
    messages: [],
    files: [],
    tasks: [],
    isLoading: true,
    error: null,
    isAuthenticated: false
  });

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<'chat' | 'data' | 'tasks' | 'profile'>('chat');
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeViz, setActiveViz] = useState<VisualizationData | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', username: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [profileForm, setProfileForm] = useState<UserProfile>({ name: '', role: '', preferences: '' });
  
  // State for confirmation modal
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning';
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const savedUsername = localStorage.getItem('cf_username');
        if (savedUsername) {
          const [profile, messages, files, tasks] = await Promise.all([
            MockBackend.getProfile(savedUsername),
            MockBackend.getMessages(),
            MockBackend.getFiles(),
            MockBackend.getTasks()
          ]);
          
          setState(prev => ({
            ...prev,
            profile,
            messages,
            files,
            tasks,
            isLoading: false,
            error: null,
            isAuthenticated: true
          }));
          setProfileForm(profile);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to load local database.' }));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await MockBackend.login(loginForm);
      localStorage.setItem('cf_username', user.username);
      const profile = await MockBackend.getProfile(user.username);
      setState(prev => ({ ...prev, isAuthenticated: true, profile }));
      setProfileForm(profile);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MockBackend.register(registerForm);
      alert("Account created! You can now log in.");
      setIsRegistering(false);
      setLoginForm({ username: registerForm.username, password: registerForm.password });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false }));
    localStorage.removeItem('cf_username');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = localStorage.getItem('cf_username');
    if (!username) return;
    
    setIsSyncing(true);
    await MockBackend.saveProfile(profileForm, username);
    setState(prev => ({ ...prev, profile: profileForm }));
    setIsSyncing(false);
    alert("Profile updated successfully");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfileForm(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (customPrompt?: string, filesOverride?: UploadedFile[]) => {
    const finalInput = customPrompt || input;
    if (!finalInput.trim() || state.isLoading) return;

    setIsSyncing(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: finalInput,
      timestamp: new Date()
    };

    await MockBackend.saveMessage(userMessage);

    const newMessages = [...state.messages, userMessage];
    setState(prev => ({ ...prev, messages: newMessages, isLoading: true }));
    setInput('');

    const context = buildContext({ ...state, messages: newMessages, files: filesOverride || state.files });
    const aiResponse = await queryAI(
      finalInput, 
      context, 
      newMessages.map(m => ({ role: m.role, content: m.content }))
    );

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse.text,
      timestamp: new Date(),
      dataSource: aiResponse.sourceUsed,
      visualization: aiResponse.visualization
    };

    await MockBackend.saveMessage(assistantMessage);

    if (aiResponse.detectedAction === 'create_task' || aiResponse.detectedAction === 'generate_report') {
      const isReport = aiResponse.detectedAction === 'generate_report';
      const newTask: ScheduledTask = {
        id: Math.random().toString(36).substr(2, 9),
        title: aiResponse.actionData?.title || (isReport ? 'Data Summary Report' : 'Automated Task'),
        description: aiResponse.actionData?.description || 'Context-driven action triggered from files',
        dueDate: new Date(aiResponse.actionData?.dueDate || Date.now() + 3600000),
        status: isReport ? 'completed' : 'pending',
        type: isReport ? 'report' : 'automation',
        metadata: aiResponse.actionData
      };
      await MockBackend.saveTask(newTask);
      setState(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    }

    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, assistantMessage],
      isLoading: false 
    }));
    setIsSyncing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Data Validation: Check extension
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      alert(`Unsupported file format. Please upload one of: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    // 2. Corruption Check (Mock)
    if (file.size === 0) {
      alert("The file appears to be corrupted or empty.");
      return;
    }

    setIsSyncing(true);
    setState(prev => ({ ...prev, isLoading: true }));
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      // Extra Mock Corruption Check for JSON
      if (extension === '.json') {
        try {
          JSON.parse(content);
        } catch (e) {
          alert("Corrupted JSON detected. Please check your file content.");
          setIsSyncing(false);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type || 'text/plain',
        size: file.size,
        content: content,
        uploadDate: new Date(),
        isIndexed: true
      };
      
      await MockBackend.saveFile(newFile);
      
      setState(prev => {
        const updatedFiles = [...prev.files, newFile];
        if (activePanel === 'chat') {
          handleSendMessage(`I've just uploaded "${file.name}". Summarize the trends and provide a chart.`, updatedFiles);
        }
        return { 
          ...prev, 
          files: updatedFiles,
          isLoading: activePanel === 'chat'
        };
      });
      setIsSyncing(false);
    };

    reader.readAsText(file);
  };

  const handleDeleteFile = async (id: string) => {
    const file = state.files.find(f => f.id === id);
    setConfirmAction({
      title: 'Delete Data Asset',
      message: `Are you sure you want to remove "${file?.name || 'this file'}"? This will clear the indexed context for the AI and cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setIsSyncing(true);
        await MockBackend.deleteFile(id);
        setState(prev => ({ ...prev, files: prev.files.filter(f => f.id !== id) }));
        setIsSyncing(false);
        setConfirmAction(null);
      }
    });
  };

  const handleNewChat = () => {
    if (state.messages.length === 0) {
      setActivePanel('chat');
      return;
    }

    setConfirmAction({
      title: 'Start New Session',
      message: 'This will archive the current conversation and clear your active chat screen. Memory is stored in your local database for future reference.',
      variant: 'warning',
      onConfirm: async () => {
        setIsSyncing(true);
        await MockBackend.clearMemory();
        setState(prev => ({ ...prev, messages: [] }));
        setIsSyncing(false);
        setActivePanel('chat');
        setConfirmAction(null);
      }
    });
  };

  const handleQueryFile = (fileName: string) => {
    setActivePanel('chat');
    const query = `Analyze the file "${fileName}" and provide a summary of its primary content and key trends.`;
    handleSendMessage(query);
  };

  const handleVisualizeFile = (fileName: string) => {
    setActivePanel('chat');
    const query = `Analyze "${fileName}" and generate a data visualization (chart) showing the primary metrics or distributions found in the file.`;
    handleSendMessage(query);
  };

  if (state.isLoading && state.messages.length === 0 && !state.isAuthenticated) {
    return (
      <div className="h-screen w-full bg-[#0a0c10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
           <Loader2 className="text-indigo-500 animate-spin" size={48} />
           <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">Booting Context Engine...</p>
        </div>
      </div>
    );
  }

  // --- AUTH SCREEN ---
  if (!state.isAuthenticated) {
    return (
      <div className="h-screen w-full gradient-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card rounded-[2.5rem] p-10 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6 shadow-indigo-600/30">
              <Zap className="text-white fill-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">ContextFlow AI</h1>
            <p className="text-slate-400 text-sm">Secure local-first intelligence platform</p>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={loginForm.username}
                    onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                    placeholder="e.g. alex_rivera"
                  />
                  <User className="absolute right-5 top-4 text-slate-600" size={18} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Token</label>
                <div className="relative">
                  <input 
                    required
                    type="password" 
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-5 top-4 text-slate-600" size={18} />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.2em] text-[11px]"
              >
                Initialize Node
              </button>
              <p className="text-center text-xs text-slate-400">
                Don't have an account? {' '}
                <button type="button" onClick={() => setIsRegistering(true)} className="text-indigo-400 font-bold hover:underline">Create one</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={registerForm.name}
                    onChange={e => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                    placeholder="Alex Rivera"
                  />
                  <CheckCircle2 className="absolute right-5 top-4 text-slate-600" size={18} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Desired Username</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={registerForm.username}
                    onChange={e => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                    placeholder="e.g. alex_rivera"
                  />
                  <UserPlus className="absolute right-5 top-4 text-slate-600" size={18} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Token (Password)</label>
                <div className="relative">
                  <input 
                    required
                    type="password" 
                    value={registerForm.password}
                    onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-5 top-4 text-slate-600" size={18} />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.2em] text-[11px]"
              >
                Register Identity
              </button>
              <p className="text-center text-xs text-slate-400">
                Already have an account? {' '}
                <button type="button" onClick={() => setIsRegistering(false)} className="text-indigo-400 font-bold hover:underline">Log in</button>
              </p>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">v2.4.0 Engine • Encrypted Peer-to-Local</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0c10] overflow-hidden font-sans text-slate-200">
      
      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card rounded-[2rem] p-8 animate-in zoom-in-95 duration-200 shadow-2xl border border-white/10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
              confirmAction.variant === 'danger' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
            }`}>
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{confirmAction.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAction.onConfirm}
                className={`flex-1 py-3 px-6 rounded-xl text-white font-bold transition-all shadow-lg ${
                  confirmAction.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAXIMIZED CHART MODAL */}
      {activeViz && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 overflow-hidden"
          onClick={() => setActiveViz(null)}
        >
          <div 
            className="w-full max-w-6xl h-full max-h-[85vh] flex flex-col gap-6 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-xl md:text-3xl font-bold text-white mb-1">{activeViz.title}</h2>
                   <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">Dynamic Engine Insight</p>
                </div>
                <button 
                  onClick={() => setActiveViz(null)} 
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
             </div>
             
             <div className="flex-1 bg-[#0d1117] border border-white/5 rounded-[2rem] p-4 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-6 left-6 opacity-20 pointer-events-none">
                  <Activity size={120} className="text-indigo-500" />
                </div>
                <div className="w-full h-full relative z-10">
                  <ChartRenderer viz={activeViz} isMaximized={true} />
                </div>
             </div>
             
             <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setActiveViz(null)}
                  className="px-10 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-200 transition-all shadow-xl shadow-white/5 uppercase tracking-widest"
                >
                  Close Insight
                </button>
             </div>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt,.json,.md,.pdf,.doc,.docx,.xlsx,.xlsm,.xls,.ppt,.pptx" />
      <input type="file" ref={chatFileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt,.json,.md,.pdf,.doc,.docx,.xlsx,.xlsm,.xls,.ppt,.pptx" />
      <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />

      <aside className={`${sidebarOpen ? 'w-68' : 'w-20'} transition-all duration-500 bg-[#0d1117] border-r border-white/5 flex flex-col py-6 z-50`}>
        <div className="flex items-center gap-3 px-6 mb-10 overflow-hidden">
          <div className="w-10 h-10 min-w-[40px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white fill-white" size={20} />
          </div>
          {sidebarOpen && <h1 className="font-bold text-xl tracking-tight text-white">ContextFlow</h1>}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavButton icon={<MessageSquare size={18}/>} label="Assistant" active={activePanel === 'chat'} collapsed={!sidebarOpen} onClick={() => setActivePanel('chat')} />
          <NavButton icon={<Database size={18}/>} label="Knowledge Base" active={activePanel === 'data'} collapsed={!sidebarOpen} onClick={() => setActivePanel('data')} />
          <NavButton icon={<Activity size={18}/>} label="Automation" active={activePanel === 'tasks'} collapsed={!sidebarOpen} onClick={() => setActivePanel('tasks')} />
          <div className="pt-4 pb-2 px-4">
             {sidebarOpen && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preferences</div>}
          </div>
          <NavButton icon={<User size={18}/>} label="My Profile" active={activePanel === 'profile'} collapsed={!sidebarOpen} onClick={() => setActivePanel('profile')} />
        </nav>

        <div className="px-3 mt-auto space-y-2">
          {sidebarOpen && (
            <button 
              onClick={handleLogout}
              className="w-full h-12 flex items-center gap-3 px-4 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <Lock size={16} />
              Terminate Session
            </button>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full h-12 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors text-slate-400">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 font-medium">/</span>
            <h2 className="font-semibold text-sm uppercase tracking-widest text-slate-300">
              {activePanel === 'chat' ? 'Assistant' : activePanel.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hidden sm:flex">
                 <RefreshCw size={12} className="text-emerald-500 animate-spin" />
                 <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Syncing</span>
              </div>
            )}
            
            <button 
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 border border-indigo-400/20 group"
              title="New Chat Session"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">New Chat</span>
            </button>

            <button 
              onClick={() => setRightPanelOpen(!rightPanelOpen)} 
              className={`p-2 rounded-xl transition-all border ${rightPanelOpen ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'hover:bg-white/5 text-slate-400 border-white/10'}`}
              title="Toggle Insight Hub"
            >
              <BarChart3 size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative bg-[#0a0c10]">
          
          {activePanel === 'chat' && (
            <div className="h-full flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar">
                {state.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                      <Sparkles className="text-indigo-400" size={40} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">System Online, {state.profile.name?.split(' ')[0]}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm">
                        Ready to process private datasets. Index your files below to begin contextual inference. 
                        Supported: <span className="text-indigo-400 font-bold">CSV, JSON, MD, PDF, Excel, Word, PPT.</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button 
                        onClick={() => chatFileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.1em] text-[10px]"
                      >
                        <UploadCloud size={18} />
                        Analyze Data Node
                      </button>
                    </div>
                  </div>
                ) : (
                  state.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                        <div className={`rounded-2xl px-6 py-4 shadow-2xl ${
                          m.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-[#161b22] border border-white/10 rounded-tl-sm text-slate-200'
                        }`}>
                          <p className="text-[15px] leading-7 whitespace-pre-wrap">{m.content}</p>
                          {m.visualization && <Visualizer viz={m.visualization} onMaximize={setActiveViz} />}
                          {m.dataSource && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                              <Database size={12} className="text-indigo-400" />
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Retrieved from: {m.dataSource}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2">
                          {m.role === 'user' ? 'Operator' : 'Assistant Node'} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {state.isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#161b22] border border-white/10 rounded-2xl rounded-tl-sm px-6 py-4 flex gap-3 items-center">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">Mapping Insights...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#0d1117]/50 border-t border-white/5 backdrop-blur-md">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
                  className="max-w-5xl mx-auto flex gap-4 items-center"
                >
                   <button 
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="h-14 w-14 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 transition-all"
                   >
                     <Paperclip size={20} />
                   </button>
                   <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Input query or upload source files..."
                      className="w-full bg-[#161b22] border border-white/10 rounded-xl px-6 py-4 pr-12 focus:outline-none focus:border-indigo-500/50 transition-all text-slate-200 placeholder:text-slate-600"
                    />
                    <TrendingUp className="absolute right-4 top-4.5 text-indigo-500/40" size={18} />
                  </div>
                  <button 
                    disabled={!input.trim() || state.isLoading}
                    type="submit"
                    className="h-14 w-14 bg-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-500 disabled:opacity-30 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Send size={20} className="text-white" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {activePanel === 'data' && (
            <div className="h-full overflow-y-auto p-10 max-w-6xl mx-auto w-full animate-in fade-in duration-700">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Context Repository</h3>
                  <p className="text-slate-400 text-sm">Indexed data assets powering your personal AI node.</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 bg-white text-black font-black px-8 py-3.5 rounded-2xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 uppercase tracking-[0.1em] text-[10px]"
                >
                  <Plus size={18} />
                  Index New Asset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.files.map(file => (
                  <div key={file.id} className="bg-[#161b22] border border-white/10 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                       <button onClick={() => handleDeleteFile(file.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg">
                         <Trash2 size={16} />
                       </button>
                    </div>
                    
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                      {file.name.endsWith('.csv') || file.name.endsWith('.xlsx') ? <BarChart3 size={24} /> : <FileCode size={24} />}
                    </div>
                    
                    <h4 className="font-bold text-white text-lg mb-1 truncate pr-8">{file.name}</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-[0.2em] border border-emerald-500/20">Synced</span>
                      <span className="text-[10px] font-medium text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>

                    <div className="bg-[#0a0c10] rounded-xl p-4 border border-white/5 mb-6 flex-1">
                       <p className="text-[11px] text-slate-500 italic line-clamp-3 leading-relaxed">
                         {file.content.substring(0, 150)}...
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button 
                        onClick={() => handleQueryFile(file.name)}
                        className="flex items-center justify-center gap-2 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 rounded-xl text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                      >
                        Analyze
                        <Search size={12} />
                      </button>
                      <button 
                        onClick={() => handleVisualizeFile(file.name)}
                        className="flex items-center justify-center gap-2 py-3 bg-purple-600/10 text-purple-400 border border-purple-600/20 rounded-xl text-[10px] font-bold hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest"
                      >
                        Visualize
                        <PieIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {state.files.length === 0 && (
                  <div className="col-span-full py-32 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-600 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <UploadCloud size={32} className="opacity-20" />
                    </div>
                    <p className="text-xl font-bold text-slate-400 mb-2">No active context nodes</p>
                    <p className="text-xs text-slate-600">Upload documents to build your private intelligence library.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'tasks' && (
            <div className="h-full overflow-y-auto p-10 max-w-4xl mx-auto w-full animate-in fade-in duration-700">
              <div className="mb-12">
                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Automation Engine</h3>
                <p className="text-slate-400 text-sm">Scheduled tasks and automated reporting triggers.</p>
              </div>

              <div className="space-y-4">
                {state.tasks.map(task => (
                  <div key={task.id} className="bg-[#161b22] border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-xl">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        task.type === 'report' ? 'bg-purple-500/10 text-purple-400' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {task.type === 'report' ? <FileText size={24} /> : <Zap size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-white text-lg tracking-tight">{task.title}</h4>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em] border ${
                            task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                       <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'profile' && (
            <div className="h-full overflow-y-auto p-10 max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-8 duration-700">
              <div className="bg-[#161b22] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <Sparkles className="text-indigo-600/20" size={120} />
                </div>
                
                <form onSubmit={handleUpdateProfile} className="relative z-10">
                  <div className="flex flex-col items-center mb-10 group">
                    <div className="relative w-32 h-32 mb-6">
                      <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-indigo-600/20 shadow-2xl">
                        <img 
                          src={profileForm.avatar || 'https://picsum.photos/seed/alex/200'} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-indigo-600 p-2.5 rounded-2xl shadow-xl text-white hover:bg-indigo-500 transition-all border border-white/20"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{profileForm.name}</h3>
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-1">{profileForm.role}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" 
                          value={profileForm.name}
                          onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white font-medium" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Core Function</label>
                        <input 
                          type="text" 
                          value={profileForm.role}
                          onChange={e => setProfileForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white font-medium" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">AI Response Directives</label>
                      <textarea 
                        value={profileForm.preferences}
                        onChange={e => setProfileForm(prev => ({ ...prev, preferences: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 h-32 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white resize-none font-medium leading-relaxed" 
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSyncing}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2"
                    >
                      {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      Commit Changes to Registry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

      {rightPanelOpen && (
        <aside className="w-80 bg-[#0d1117] border-l border-white/5 p-8 flex flex-col gap-10 animate-in slide-in-from-right duration-500 z-20 shadow-2xl">
           <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-8">Visualization Hub</h3>
            <div className="space-y-4">
               {state.messages.filter(m => m.visualization).map(m => (
                 <button 
                  key={m.id} 
                  onClick={() => setActiveViz(m.visualization!)} 
                  className="w-full bg-[#161b22] border border-white/5 rounded-xl p-4 text-left hover:border-indigo-500/50 transition-all group hover:bg-[#1c232c] shadow-lg"
                 >
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                          {m.visualization?.type === 'bar' ? <BarChart3 size={16} /> : m.visualization?.type === 'line' ? <TrendingUp size={16} /> : <PieIcon size={16} />}
                       </div>
                       <div className="text-[10px] font-bold text-white truncate max-w-[150px]">{m.visualization?.title}</div>
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Source: {m.dataSource || 'Session Analysis'}</div>
                 </button>
               ))}
               {state.messages.filter(m => m.visualization).length === 0 && (
                 <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center bg-white/[0.01]">
                    <PieIcon className="mx-auto mb-3 text-slate-700" size={32} />
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-4 leading-relaxed">Generated insights will populate here in real-time.</p>
                 </div>
               )}
            </div>
          </div>

          <div className="mt-auto bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10">
             <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Local Node Synced</span>
             </div>
             <p className="text-[9px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">IDB Storage Engine v2.4 • Vector Mapping Online</p>
          </div>
        </aside>
      )}
    </div>
  );
};

const NavButton: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, collapsed?: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${active ? 'bg-white text-black shadow-2xl shadow-white/5 font-bold scale-[1.02]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-100 font-medium'}`}>
    <div className="flex-shrink-0">{icon}</div>
    {!collapsed && <span className="text-xs truncate tracking-tight uppercase tracking-[0.1em]">{label}</span>}
  </button>
);

export default App;

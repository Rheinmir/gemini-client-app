import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Plus, MessageSquare, Trash2, Settings, Menu, X, Sparkles, Download, Upload, Zap, Brain, Database, Cpu, Wrench, ScrollText, Palette, CloudSun, Cloud, Edit2, Check } from 'lucide-react';
import { GEMINI_TOOLS } from './tools';
import { generateTheme } from './themeHelper';

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_SYSTEM_INSTRUCTION = `Bạn là Gemin-Toon, một trợ lý AI thông minh.
KỸ NĂNG:
1. search_memory: Tìm kiếm thông tin cũ.
2. change_theme_color: Đổi màu giao diện.
3. get_weather: Xem thời tiết (Cần OpenWeatherMap Key).

NHIỆM VỤ: Trả lời ngắn gọn, hài hước, hữu ích. Dùng Markdown (in đậm, list) để trình bày đẹp.`;

export default function App() {
  const [config, setConfig] = useState({
    geminiKey: '',
    openaiKey: '',
    weatherKey: '',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-3.5-turbo',
    activeProvider: 'gemini',
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION
  });
  
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [useFullContext, setUseFullContext] = useState(false);
  const [dbStatus, setDbStatus] = useState('offline');
  const [toolStatus, setToolStatus] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [forcedTool, setForcedTool] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const applyTheme = (themeData) => {
      if (!themeData) return;
      const root = document.documentElement;
      root.style.setProperty('--app-bg', themeData.appBg);
      root.style.setProperty('--sidebar-bg', themeData.sidebarBg);
      root.style.setProperty('--component-bg', themeData.componentBg);
      root.style.setProperty('--accent-color', themeData.accentColor);
      root.style.setProperty('--text-color', themeData.textColor);
      root.style.setProperty('--border-color', themeData.borderColor || '#000000');
      root.style.setProperty('--shadow-color', themeData.shadowColor || '#000000');
      localStorage.setItem('cached_theme', JSON.stringify(themeData));
  };

  const syncThemeFromServer = async () => {
      try {
          const res = await fetch('/api/settings/theme');
          if (res.ok) {
              const serverTheme = await res.json();
              if (serverTheme && serverTheme.appBg) applyTheme(serverTheme);
          }
      } catch (e) {}
  };

  useEffect(() => {
      const cached = localStorage.getItem('cached_theme');
      if (cached) applyTheme(JSON.parse(cached));
      syncThemeFromServer();
      const interval = setInterval(syncThemeFromServer, 3000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedConfig = localStorage.getItem('app_config');
    if (storedConfig) {
        setConfig(prev => ({ ...prev, ...JSON.parse(storedConfig) }));
    } else {
        setIsConfiguring(true); 
    }
    fetchSessions();
  }, []);

  const saveConfig = (newConfig) => {
      setConfig(newConfig);
      localStorage.setItem('app_config', JSON.stringify(newConfig));
      setIsConfiguring(false);
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setSessions(data);
          if (!currentSessionId) setCurrentSessionId(data[0].id);
        } else { createNewSession(); }
        setDbStatus('online');
      }
    } catch (err) {
      setSessions([{ id: 'offline', title: 'Offline Mode', messages: [{role:'model', text:'Lỗi kết nối Server.'}], provider: 'gemini' }]);
    }
  };

  const saveSessionToDb = async (session) => {
    setDbStatus('syncing');
    try {
      await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) });
      setDbStatus('online');
    } catch (err) { setDbStatus('offline'); }
  };

  const deleteSessionFromDb = async (id) => { try { await fetch(`/api/sessions/${id}`, { method: 'DELETE' }); } catch(err) {} };

  const startRenaming = (e, session) => {
      e.stopPropagation();
      setEditingSessionId(session.id);
      setRenameText(session.title);
  };

  const saveRename = async (id) => {
      if (!renameText.trim()) return;
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: renameText } : s));
      setEditingSessionId(null);
      try {
          await fetch(`/api/sessions/${id}/title`, {
              method: 'PATCH',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ title: renameText })
          });
      } catch (err) { console.error("Rename failed", err); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sessions, currentSessionId, toolStatus]);

  const createNewSession = () => {
    const newSession = {
      id: generateId(), title: `Chat ${sessions.length + 1}`, messages: [{ role: 'model', text: `Chào! Tôi là Gemin-Toon.` }], provider: config.activeProvider
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    saveSessionToDb(newSession);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    await deleteSessionFromDb(id);
    if (newSessions.length === 0) createNewSession();
    else {
       setSessions(newSessions);
       if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);
    }
  };

  const handleExportToon = () => {
    const toonData = { fileType: 'toon-chat-archive', version: '2.0', exportedAt: new Date().toISOString(), data: sessions };
    const blob = new Blob([JSON.stringify(toonData, null, 2)], { type: "application/json" });
    const link = document.createElement('a');
    link.download = `backup-${new Date().getTime()}.toon`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportToon = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.fileType === 'toon-chat-archive' && Array.isArray(parsed.data)) {
            setSessions(parsed.data);
            setCurrentSessionId(parsed.data[0]?.id);
            for (const sess of parsed.data) await saveSessionToDb(sess);
            alert('Import thành công!');
        } else { alert('File lỗi!'); }
      } catch (err) { alert('Lỗi đọc file!'); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const executeTool = async (functionName, args) => {
      if (functionName === 'search_memory') {
          setToolStatus(`🔍 Đang tìm: "${args.keyword}"...`);
          try {
              const res = await fetch(`/api/search?q=${encodeURIComponent(args.keyword)}`);
              const data = await res.json();
              setTimeout(() => setToolStatus(null), 1000);
              if (data.length === 0) return "Không tìm thấy.";
              return JSON.stringify(data);
          } catch (e) { return "Lỗi DB."; }
      } 
      
      if (functionName === 'change_theme_color') {
          setToolStatus(`🎨 Đang tô màu: ${args.colorName}...`);
          const newTheme = generateTheme(args.colorName);
          applyTheme(newTheme);
          await fetch('/api/settings/theme', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newTheme) });
          setTimeout(() => setToolStatus(null), 1000);
          return `Đã đổi sang theme: ${args.colorName}.`;
      }

      if (functionName === 'get_weather') {
          setToolStatus(`🌤️ Đang xem thời tiết ${args.city}...`);
          try {
              const res = await fetch(`/api/weather?city=${encodeURIComponent(args.city)}&key=${config.weatherKey}`);
              const data = await res.json();
              setTimeout(() => setToolStatus(null), 1000);
              if (data.error) return `Lỗi: ${data.error}`;
              return `Thời tiết tại ${data.location}:\n* Nhiệt độ: **${data.temperature}°C**\n* Tình trạng: **${data.description}**\n* Độ ẩm: ${data.humidity}%\n* Gió: ${data.wind_speed} m/s`;
          } catch (e) { return "Lỗi kết nối thời tiết."; }
      }

      return "Tool không tồn tại.";
  };

  const callGemini = async (messages, forcedSystemPrompt) => {
      const historyPayload = useFullContext ? messages : messages.slice(-10);
      const contents = historyPayload.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
      const sysInstruction = forcedSystemPrompt ? forcedSystemPrompt : config.systemInstruction;

      const res1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${config.geminiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: sysInstruction }] }, tools: GEMINI_TOOLS })
      });
      const data1 = await res1.json();
      const firstPart = data1.candidates?.[0]?.content?.parts?.[0];

      if (firstPart?.functionCall) {
          const fn = firstPart.functionCall;
          const toolResult = await executeTool(fn.name, fn.args);
          const contentsWithFunction = [...contents, { role: 'model', parts: [{ functionCall: fn }] }, { role: 'function', parts: [{ functionResponse: { name: fn.name, response: { content: toolResult } } }] }];
          
          const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${config.geminiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: contentsWithFunction, systemInstruction: { parts: [{ text: sysInstruction }] } }) 
          });
          const data2 = await res2.json();
          return data2.candidates?.[0]?.content?.parts?.[0]?.text || "Đã xong.";
      }
      return firstPart?.text || "Lỗi phản hồi.";
  };

  const callOpenAI = async (messages, forcedSystemPrompt) => {
      const historyPayload = useFullContext ? messages : messages.slice(-10);
      const sysInstruction = forcedSystemPrompt ? forcedSystemPrompt : config.systemInstruction;
      const apiMessages = [{ role: "system", content: sysInstruction }, ...historyPayload.map(msg => ({ role: msg.role === 'model' ? 'assistant' : msg.role, content: msg.text }))];
      const baseUrl = config.openaiBaseUrl.replace(/\/$/, ""); 
      const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openaiKey}` },
          body: JSON.stringify({ model: config.openaiModel, messages: apiMessages })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "Lỗi phản hồi.";
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (!config.geminiKey && config.activeProvider === 'gemini') { setIsConfiguring(true); return; }

    const userText = input.trim();
    const session = sessions.find(s => s.id === currentSessionId);
    const hasUserMessages = session?.messages.some(m => m.role === 'user');
    const newTitle = (!hasUserMessages) 
        ? (userText.length > 30 ? userText.slice(0, 30) + '...' : userText) 
        : session?.title;

    const updatedMessages = [...(session?.messages || []), { role: 'user', text: userText }];
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages, title: newTitle } : s));
    setInput('');
    setIsLoading(true);

    let tempSystemPrompt = config.systemInstruction;
    if (forcedTool) {
        tempSystemPrompt += `\n[CHẾ ĐỘ BẮT BUỘC]: Bỏ qua mọi ngữ cảnh. BẮT BUỘC gọi tool '${forcedTool}' ngay lập tức.`;
    }
    
    const lowerInput = userText.toLowerCase();
    if (['màu', 'theme', 'nền', 'giao diện'].some(k => lowerInput.includes(k))) {
        tempSystemPrompt += `\n[CHẾ ĐỘ ƯU TIÊN]: Phát hiện ý định đổi màu. BẮT BUỘC gọi tool 'change_theme_color' ngay lập tức.`;
    }

    try {
      const botResponse = config.activeProvider === 'gemini' 
        ? await callGemini(updatedMessages, tempSystemPrompt) 
        : await callOpenAI(updatedMessages, tempSystemPrompt);
      
      const finalMessages = [...updatedMessages, { role: 'model', text: botResponse }];
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: finalMessages } : s));
      saveSessionToDb({ id: currentSessionId, title: newTitle, messages: finalMessages, provider: config.activeProvider });
    } catch (err) { console.error(err); } finally { 
        setIsLoading(false); 
        setToolStatus(null); 
        setForcedTool(null); 
    }
  };

  const currentSessionMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

  if (isConfiguring) return (
    <div className="min-h-screen flex items-center justify-center p-4 font-mono bg-[var(--app-bg)] transition-colors">
        <div className="max-w-2xl w-full bg-[var(--component-bg)] text-[var(--text-color)] border-4 border-[var(--border-color)] shadow-hard-lg p-8 max-h-[90vh] overflow-y-auto rounded-none">
            <h1 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter"><Settings size={32}/> CẤU HÌNH BOT</h1>
            
            <div className="space-y-6">
                <div className="border-4 border-[var(--border-color)] p-4 bg-yellow-200 text-black shadow-hard-sm">
                    <h3 className="font-bold flex items-center gap-2 mb-2 uppercase"><ScrollText size={20}/> Nhập Vai (System Prompt)</h3>
                    <textarea rows="3" value={config.systemInstruction} onChange={e => setConfig({...config, systemInstruction: e.target.value})} className="w-full border-2 border-black p-3 text-sm font-bold bg-white focus:outline-none focus:ring-2 ring-black"/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-4 border-[var(--border-color)] p-4 bg-blue-200 text-black shadow-hard-sm">
                        <h3 className="font-bold flex items-center gap-2 mb-2 uppercase"><Sparkles size={20}/> Gemini</h3>
                        <input type="password" placeholder="Gemini Key..." value={config.geminiKey} onChange={e => setConfig({...config, geminiKey: e.target.value})} className="w-full border-2 border-black p-2 font-bold"/>
                    </div>
                    <div className="border-4 border-[var(--border-color)] p-4 bg-green-200 text-black shadow-hard-sm">
                        <h3 className="font-bold flex items-center gap-2 mb-2 uppercase"><Cpu size={20}/> OpenAI / Groq</h3>
                        <input type="text" placeholder="Base URL..." value={config.openaiBaseUrl} onChange={e => setConfig({...config, openaiBaseUrl: e.target.value})} className="w-full border-2 border-black p-2 mb-2 text-xs font-bold"/>
                        <input type="text" placeholder="Model Name..." value={config.openaiModel} onChange={e => setConfig({...config, openaiModel: e.target.value})} className="w-full border-2 border-black p-2 mb-2 text-xs font-bold"/>
                        <input type="password" placeholder="API Key..." value={config.openaiKey} onChange={e => setConfig({...config, openaiKey: e.target.value})} className="w-full border-2 border-black p-2 font-bold"/>
                    </div>
                </div>

                <div className="border-4 border-[var(--border-color)] p-4 bg-orange-200 text-black shadow-hard-sm">
                    <h3 className="font-bold flex items-center gap-2 mb-2 uppercase"><Cloud size={20}/> Weather Key (OpenWeatherMap)</h3>
                    <input type="password" placeholder="OpenWeatherMap API Key..." value={config.weatherKey} onChange={e => setConfig({...config, weatherKey: e.target.value})} className="w-full border-2 border-black p-2 font-bold"/>
                    <p className="text-xs mt-1">Cần key để xem thời tiết. Lấy tại openweathermap.org</p>
                </div>

                <div>
                    <label className="font-black block mb-2 uppercase">Model Mặc Định:</label>
                    <select value={config.activeProvider} onChange={e => setConfig({...config, activeProvider: e.target.value})} className="w-full border-4 border-[var(--border-color)] p-3 font-bold bg-white text-black shadow-hard-sm focus:outline-none">
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI Compatible</option>
                    </select>
                </div>

                <button onClick={() => saveConfig(config)} className="w-full bg-[var(--accent-color)] text-white font-black text-xl py-4 border-4 border-[var(--border-color)] shadow-hard hover:translate-y-1 hover:shadow-none transition-all uppercase">LƯU & BẮT ĐẦU</button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden font-mono bg-[var(--app-bg)] text-[var(--text-color)] transition-colors">
      <div className={`fixed inset-y-0 left-0 z-20 w-72 bg-[var(--sidebar-bg)] border-r-4 border-[var(--border-color)] flex flex-col transform transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-4 border-b-4 border-[var(--border-color)] flex justify-between items-center bg-[var(--accent-color)] text-white">
           <h2 className="font-black text-xl flex gap-2 uppercase tracking-tight"><Sparkles/> {config.activeProvider}</h2>
           <button onClick={() => setShowSidebar(false)} className="md:hidden"><X/></button>
        </div>
        <div className="p-4"><button onClick={createNewSession} className="w-full bg-[var(--component-bg)] text-[var(--text-color)] border-4 border-[var(--border-color)] p-3 font-bold shadow-hard hover:shadow-none hover:translate-y-1 flex items-center justify-center gap-2 uppercase"><Plus/> New Chat</button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessions.map(s => (
                <div key={s.id} onClick={() => { setCurrentSessionId(s.id); if(window.innerWidth < 768) setShowSidebar(false); }} className={`p-3 border-4 border-[var(--border-color)] cursor-pointer truncate transition-all ${currentSessionId === s.id ? 'bg-[var(--accent-color)] text-white shadow-hard' : 'bg-[var(--component-bg)] hover:bg-gray-100'}`}>
                    <div className="flex justify-between items-center">
                        {editingSessionId === s.id ? (
                            <input autoFocus value={renameText} onChange={e => setRenameText(e.target.value)} onBlur={() => saveRename(s.id)} onKeyDown={e => e.key === 'Enter' && saveRename(s.id)} onClick={e => e.stopPropagation()} className="w-full bg-white text-black border border-black p-1 text-xs font-bold" />
                        ) : (
                            <div className="flex items-center gap-2 w-full overflow-hidden">
                                <span className="truncate font-bold text-sm flex-1">{s.title}</span>
                                <button onClick={(e) => startRenaming(e, s)} className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity"><Edit2 size={12}/></button>
                            </div>
                        )}
                        <button onClick={(e) => deleteSession(e, s.id)} className="hover:text-red-500 ml-1"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
        </div>
        
        <div className="p-4 border-t-4 border-[var(--border-color)] bg-[var(--component-bg)] grid grid-cols-2 gap-2">
             <button onClick={handleExportToon} className="flex items-center justify-center gap-1 text-xs font-black border-4 border-[var(--border-color)] p-2 bg-yellow-300 text-black hover:bg-yellow-400 shadow-hard hover:shadow-none transition-all uppercase"><Download size={14} /> SAVE</button>
             <input type="file" ref={fileInputRef} onChange={handleImportToon} className="hidden" accept=".toon" />
             <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center gap-1 text-xs font-black border-4 border-[var(--border-color)] p-2 bg-green-300 text-black hover:bg-green-400 shadow-hard hover:shadow-none transition-all uppercase"><Upload size={14} /> LOAD</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative">
        <header className="bg-[var(--component-bg)] border-b-4 border-[var(--border-color)] p-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setShowSidebar(!showSidebar)} className="md:hidden"><Menu/></button>
                <h1 className="font-black text-2xl truncate uppercase tracking-tight">{sessions.find(s => s.id === currentSessionId)?.title}</h1>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setUseFullContext(!useFullContext)} className={`hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-black border-4 border-[var(--border-color)] shadow-hard hover:shadow-none transition-all uppercase ${useFullContext ? 'bg-pink-400 text-black' : 'bg-emerald-400 text-black'}`}>
                    {useFullContext ? <Brain size={14} /> : <Zap size={14} />} <span>{useFullContext ? 'FULL' : 'ECO'}</span>
                </button>

                <div title={`DB: ${dbStatus}`} className={`w-4 h-4 rounded-full border-2 border-black ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <button onClick={() => setIsConfiguring(true)} className="hover:rotate-90 transition-transform"><Settings size={28}/></button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {currentSessionMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] p-4 border-4 border-[var(--border-color)] text-base font-medium shadow-hard ${msg.role === 'user' ? 'bg-[var(--accent-color)] text-white rounded-none' : 'bg-[var(--component-bg)] rounded-none'}`}>
                        <div className="font-black text-xs mb-2 opacity-80 flex items-center gap-1 uppercase tracking-widest border-b-2 border-current pb-1 w-fit">
                            {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>} {msg.role}
                        </div>
                        <div className="markdown-content"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                    </div>
                </div>
            ))}
            {toolStatus && <div className="flex justify-start"><div className="bg-yellow-300 border-4 border-black p-3 text-sm font-black flex gap-2 animate-bounce text-black shadow-hard"><Wrench size={18}/> {toolStatus}</div></div>}
            {isLoading && !toolStatus && <div className="flex justify-start"><div className="bg-[var(--component-bg)] border-4 border-[var(--border-color)] p-4 shadow-hard flex gap-2"><div className="w-3 h-3 bg-[var(--text-color)] animate-bounce"></div><div className="w-3 h-3 bg-[var(--text-color)] animate-bounce delay-75"></div><div className="w-3 h-3 bg-[var(--text-color)] animate-bounce delay-150"></div></div></div>}
            <div ref={messagesEndRef} />
        </div>

        <div className="bg-[var(--component-bg)] border-t-4 border-[var(--border-color)] p-6">
            <div className="max-w-4xl mx-auto flex gap-3 relative">
                <div className="relative flex items-center">
                    <button onClick={() => setForcedTool(forcedTool ? null : 'auto')} className={`p-3 border-4 border-[var(--border-color)] shadow-hard hover:shadow-none transition-all ${forcedTool ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-black'}`} title="Ép dùng Tool (Manual Override)"><Wrench size={24}/></button>
                    {forcedTool === 'auto' && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border-4 border-black shadow-hard flex flex-col z-50">
                            <button onClick={() => setForcedTool('search_memory')} className="p-2 hover:bg-gray-200 text-left text-xs font-bold border-b border-black">🔍 Tìm Ký Ức</button>
                            <button onClick={() => setForcedTool('change_theme_color')} className="p-2 hover:bg-gray-200 text-left text-xs font-bold border-b border-black">🎨 Đổi Màu</button>
                            <button onClick={() => setForcedTool('get_weather')} className="p-2 hover:bg-gray-200 text-left text-xs font-bold">🌤️ Thời Tiết</button>
                        </div>
                    )}
                </div>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={forcedTool && forcedTool !== 'auto' ? `[CHẾ ĐỘ ÉP TOOL]: ${forcedTool}...` : "Nhập tin nhắn..."} disabled={isLoading} className="flex-1 border-4 border-[var(--border-color)] p-4 shadow-hard text-lg font-bold bg-[var(--app-bg)] focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder-[var(--text-color)]/50"/>
                <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="bg-[var(--accent-color)] text-white border-4 border-[var(--border-color)] px-8 shadow-hard hover:shadow-none hover:translate-y-1 font-black uppercase tracking-widest"><Send size={24}/></button>
            </div>
        </div>
      </div>
    </div>
  );
}
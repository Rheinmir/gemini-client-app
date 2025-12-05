import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; 
import { Send, Bot, User, Plus, MessageSquare, Trash2, Settings, Menu, X, Sparkles, Download, Upload, Zap, Brain, Database, Cpu, Wrench, ScrollText, Palette, CloudSun, Cloud, Edit2, Check, BarChart3 } from 'lucide-react';
import { GEMINI_TOOLS } from './tools';
import { generateTheme } from './themeHelper';

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_SYSTEM_INSTRUCTION = `Bạn là Gemin-Toon, một trợ lý AI thông minh.
KỸ NĂNG:
1. search_memory: Tìm kiếm thông tin cũ.
2. change_theme_color: Đổi màu giao diện.
3. get_weather: Xem dự báo thời tiết CHÍNH XÁC tại thành phố.
4. get_app_insights: Lấy dữ liệu phân tích.

NHIỆM VỤ: Trả lời ngắn gọn, hài hước, hữu ích. Dùng Markdown (in đậm, list) để trình bày đẹp.`;

// Async function to log actions
const logAction = async (type, detail = {}, sessionId = null) => {
    try {
        await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action_type: type, 
                detail: detail, 
                session_id: sessionId 
            })
        });
    } catch (e) {
        console.error("Failed to log action:", e);
    }
};

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
  const [forcedTool, setForcedTool] = useState(null); // 'auto' for dropdown, or tool name

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null); // ⭐ ĐÃ THÊM: Ref cho textarea

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
    logAction('UI_APP_LOAD'); // Log app load
  }, []);

  const saveConfig = (newConfig) => {
      setConfig(newConfig);
      localStorage.setItem('app_config', JSON.stringify(newConfig));
      setIsConfiguring(false);
      logAction('UI_SAVE_CONFIG', { provider: newConfig.activeProvider }); // Log save config
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

  const deleteSessionFromDb = async (id) => { 
    try { 
        await fetch(`/api/sessions/${id}`, { method: 'DELETE' }); 
        logAction('UI_DELETE_SESSION', { sessionId: id }); // Log delete session
    } catch(err) {} 
  };

  const startRenaming = (e, session) => {
      e.stopPropagation();
      setEditingSessionId(session.id);
      setRenameText(session.title);
  };

  const saveRename = async (id) => {
      if (!renameText.trim()) return;
      const oldTitle = sessions.find(s => s.id === id)?.title || '';
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: renameText } : s));
      setEditingSessionId(null);
      try {
          await fetch(`/api/sessions/${id}/title`, {
              method: 'PATCH',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ title: renameText })
          });
          logAction('UI_RENAME_SESSION', { sessionId: id, oldTitle, newTitle: renameText }); // Log rename session
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
    logAction('UI_CREATE_SESSION', { sessionId: newSession.id }); // Log create session
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
    logAction('UI_EXPORT_DATA', { sessionCount: sessions.length }); // Log export data
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
            logAction('UI_IMPORT_DATA', { importedSessionCount: parsed.data.length }); // Log import data
        } else { alert('File lỗi!'); }
      } catch (err) { alert('Lỗi đọc file!'); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleForceToolChange = (toolName) => {
      setForcedTool(toolName);
      logAction('UI_FORCE_TOOL', { tool: toolName }); // Log force tool selection
  };
  
  const executeTool = async (functionName, args) => {
      if (functionName === 'search_memory') {
          setToolStatus(`🔍 Đang tìm: "${args.keyword}"...`);
          logAction('TOOL_SEARCH_MEMORY', { keyword: args.keyword }, currentSessionId);
          try {
              const res = await fetch(`/api/search?q=${encodeURIComponent(args.keyword)}`);
              const data = await res.json();
              setTimeout(() => setToolStatus(null), 1000);
              if (data.length === 0) return "Không tìm thấy thông tin nào.";
              return JSON.stringify(data);
          } catch (e) { return "Lỗi DB."; }
      } 
      
      if (functionName === 'change_theme_color') {
          const colorInput = args.colorName || args.color || 'default';
          setToolStatus(`🎨 Đang phối màu: ${colorInput}...`);
          const newTheme = generateTheme(colorInput);
          applyTheme(newTheme);
          await fetch('/api/settings/theme', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newTheme) });
          setTimeout(() => setToolStatus(null), 1000);
          logAction('TOOL_CHANGE_THEME_COLOR', { color: colorInput }, currentSessionId); // Log tool usage
          return `Đã đổi sang theme: ${colorInput}.`;
      }

      if (functionName === 'get_weather') {
          setToolStatus(`🌤️ Đang xem thời tiết ${args.city}...`);
          logAction('TOOL_GET_WEATHER', { city: args.city }, currentSessionId); // Log tool usage
          try {
              const res = await fetch(`/api/weather?city=${encodeURIComponent(args.city)}&key=${config.weatherKey}`);
              const data = await res.json();
              setTimeout(() => setToolStatus(null), 1000);
              
              if (data.error) {
                  const errorDetails = data.details ? `(Chi tiết: ${data.details.join(' | ')})` : '';
                  return `⚠️ HỆ THỐNG BÁO LỖI: ${data.error}. ${errorDetails}`;
              }
              
              const src = data.source ? `[Nguồn: ${data.source}]` : "";
              return `Thời tiết tại ${data.location} ${src}:\n* **Nhiệt độ:** ${data.temperature}°C\n* **Tình trạng:** ${data.description}\n* **Cảm giác:** ${data.feels_like || data.temperature}°C\n* **Độ ẩm:** ${data.humidity}%\n* **Gió:** ${data.wind_speed} m/s`;
          } catch (e) { return `⚠️ Lỗi mạng nghiêm trọng: ${e.message}`; }
      }
      
      if (functionName === 'get_app_insights') {
          setToolStatus(`📊 Đang thu thập Insights...`);
          logAction('TOOL_GET_APP_INSIGHTS', {}, currentSessionId); // Log tool usage
          try {
              const res = await fetch('/api/insights');
              const data = await res.json();
              setTimeout(() => setToolStatus(null), 1000);
              return JSON.stringify(data);
          } catch (e) {
              return `⚠️ Lỗi khi lấy Insights: ${e.message}`;
          }
      }


      return "Tool không tồn tại.";
  };

  const callGemini = async (messages, forcedSystemPrompt) => {
      const isForced = !!forcedSystemPrompt;
      const historyPayload = (useFullContext && !isForced) ? messages : messages.slice(-1);
      const contents = historyPayload.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
      const sysInstruction = forcedSystemPrompt ? forcedSystemPrompt : config.systemInstruction;

      try {
          const res1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${config.geminiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: sysInstruction }] }, tools: GEMINI_TOOLS })
          });
          
          if (!res1.ok) {
              const errorData = await res1.json();
              throw new Error(errorData.error?.message || "Lỗi API Gemini");
          }

          const data1 = await res1.json();
          const firstPart = data1.candidates?.[0]?.content?.parts?.[0];

          if (isForced && !firstPart?.functionCall) {
              return "⚠️ LỖI LOGIC: Model không gọi tool theo yêu cầu. Hãy thử gõ lại rõ ràng hơn.";
          }

          if (firstPart?.functionCall) {
              const fn = firstPart.functionCall;
              const toolResult = await executeTool(fn.name, fn.args);
              const contentsWithFunction = [...contents, { role: 'model', parts: [{ functionCall: fn }] }, { role: 'function', parts: [{ functionResponse: { name: fn.name, response: { content: toolResult } } }] }];
              
              const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${config.geminiKey}`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: contentsWithFunction, systemInstruction: { parts: [{ text: sysInstruction }] } }) 
              });
              
              if (!res2.ok) {
                 throw new Error("Lỗi khi gọi lại sau tool execution");
              }

              const data2 = await res2.json();
              return data2.candidates?.[0]?.content?.parts?.[0]?.text || "Đã xong.";
          }
          return firstPart?.text || "Lỗi phản hồi.";
      } catch (e) {
          console.error("Gemini Error:", e);
          return `Lỗi hệ thống: ${e.message}`;
      }
  };

  const callOpenAI = async (messages, forcedSystemPrompt) => {
      const isForced = !!forcedSystemPrompt;
      const historyPayload = (useFullContext && !isForced) ? messages : messages.slice(-1);
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

    logAction('UI_SEND_MESSAGE', { message: userText, provider: config.activeProvider }, currentSessionId); // Log send message
    
    // Đặt lại chiều cao textarea sau khi gửi
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }


    let tempSystemPrompt = null;
    
    const lowerInput = userText.toLowerCase();
    const normInput = lowerInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Check for Tool usage trigger phrases (including the new insight tool)
    if (forcedTool && forcedTool !== 'auto') {
        tempSystemPrompt = `${config.systemInstruction}\n[SYSTEM]: BẮT BUỘC gọi tool '${forcedTool}' ngay. Bỏ qua ngữ cảnh cũ.`;
        if (forcedTool === 'get_weather') setToolStatus("🌤️ Đang kết nối vệ tinh...");
        if (forcedTool === 'change_theme_color') setToolStatus("🎨 Đang chọn màu...");
        if (forcedTool === 'search_memory') setToolStatus("🧠 Đang lục lọi ký ức...");
        if (forcedTool === 'get_app_insights') setToolStatus("📊 Đang thu thập Insights...");
    } else if (['màu', 'theme', 'nền', 'giao diện', 'mau', 'nen'].some(k => normInput.includes(k))) {
        tempSystemPrompt = `${config.systemInstruction}\n[SYSTEM]: Người dùng muốn đổi màu. Hãy gọi tool 'change_theme_color' NGAY LẬP TỨC.`;
        setToolStatus("🎨 Đang phân tích màu sắc...");
    } else if (['thời tiết', 'nhiệt độ', 'mưa', 'nắng', 'thoi tiet', 'nhiet do'].some(k => normInput.includes(k))) {
        tempSystemPrompt = `${config.systemInstruction}\n[SYSTEM]: Người dùng muốn xem thời tiết. Hãy gọi tool 'get_weather' NGAY LẬP TỨC.`;
        setToolStatus("🌤️ Đang kết nối vệ tinh...");
    } else if (['nhớ', 'quên', 'lục lại', 'tìm lại', 'đã nói', 'ký ức', 'ky uc'].some(k => normInput.includes(k))) {
        tempSystemPrompt = `${config.systemInstruction}\n[SYSTEM]: Người dùng muốn tìm ký ức. Hãy gọi tool 'search_memory' NGAY LẬP TỨC.`;
        setToolStatus("🧠 Đang kết nối ký ức...");
    } else if (['phân tích', 'insight', 'thống kê', 'dữ liệu', 'phan tich', 'thong ke', 'du lieu'].some(k => normInput.includes(k))) {
        tempSystemPrompt = `${config.systemInstruction}\n[SYSTEM]: Người dùng muốn xem phân tích/thống kê app. Hãy gọi tool 'get_app_insights' NGAY LẬP TỨC.`;
        setToolStatus("📊 Đang thu thập Insights...");
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
    // Main container for configuration screen (fixed, centered)
    <div className="fixed inset-0 flex items-center justify-center p-4 font-mono bg-[var(--app-bg)] transition-colors z-[100]">
        <div className="max-w-2xl w-full bg-[var(--component-bg)] text-[var(--text-color)] border-4 border-[var(--border-color)] shadow-hard-lg rounded-none flex flex-col max-h-[95vh]">
            
            {/* Header (fixed at top of modal) */}
            <h1 className="text-3xl font-black p-8 pb-4 flex items-center gap-3 uppercase tracking-tighter flex-shrink-0"><Settings size={32}/> CẤU HÌNH BOT</h1>
            
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-8 pt-0 space-y-6">
                
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
                    <input type="password" placeholder="Optional: API Key..." value={config.weatherKey} onChange={e => setConfig({...config, weatherKey: e.target.value})} className="w-full border-2 border-black p-2 font-bold"/>
                    <p className="text-xs mt-1">Cần key để xem thời tiết. Lấy tại openweathermap.org</p>
                </div>

                <div>
                    <label className="font-black block mb-2 uppercase">Model Mặc Định:</label>
                    <select value={config.activeProvider} onChange={e => setConfig({...config, activeProvider: e.target.value})} className="w-full border-4 border-[var(--border-color)] p-3 font-bold bg-white text-black shadow-hard-sm focus:outline-none">
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI Compatible</option>
                    </select>
                </div>
                
                {/* Add margin to bottom of scrollable content */}
                <div className="h-4"></div> 
            </div>

            {/* Sticky Footer (Save Button) */}
            <div className="p-4 border-t-4 border-[var(--border-color)] flex-shrink-0 bg-[var(--component-bg)]">
                <button onClick={() => saveConfig(config)} className="w-full bg-[var(--accent-color)] text-white font-black text-xl py-4 border-4 border-[var(--border-color)] shadow-hard hover:translate-y-1 hover:shadow-none transition-all uppercase">LƯU & BẮT ĐẦU</button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden font-mono bg-[var(--app-bg)] text-[var(--text-color)] transition-colors w-screen">
      {/* Mobile Backdrop - Z-40 */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}
      
      {/* SIDEBAR NEW DESIGN */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50
          w-[270px] bg-[var(--sidebar-bg)]
          border-r-4 border-[var(--border-color)]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
          ${!showSidebar && 'md:w-0 md:overflow-hidden md:border-r-0'}
        `}
      >

        {/* HEADER */}
        <div className="p-4 border-b-4 border-[var(--border-color)] bg-[var(--accent-color)] text-white flex justify-between items-center">
          <h2 className="font-black text-xl tracking-tight flex gap-2 uppercase">
            <Sparkles size={22}/> {config.activeProvider.toUpperCase()}
          </h2>
          <button onClick={() => setShowSidebar(false)} className="md:hidden">
            <X size={22} />
          </button>
        </div>

        {/* NEW CHAT BUTTON */}
        <div className="p-4">
          <button
            onClick={createNewSession}
            className="
              w-full bg-[var(--component-bg)] border-4 border-[var(--border-color)]
              p-3 rounded-lg font-black text-sm
              shadow-hard hover:shadow-none hover:translate-y-[2px]
              transition-all flex items-center justify-center gap-2 uppercase
            "
          >
            <Plus size={18} /> New Chat
          </button>
        </div>

        {/* SESSION LIST */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">

          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setCurrentSessionId(s.id);
                logAction("UI_SWITCH_SESSION", { sessionId: s.id });
                if (window.innerWidth < 768) setShowSidebar(false);
              }}
              className={`
                border-4 border-[var(--border-color)] rounded-lg p-3 cursor-pointer
                shadow-hard hover:shadow-none transition-all
                flex flex-col group
                ${currentSessionId === s.id
                  ? "bg-[var(--accent-color)] text-white"
                  : "bg-[var(--component-bg)]"
                }
              `}
            >
              <div className="flex items-center justify-between">
                {editingSessionId === s.id ? (
                  <input
                    autoFocus
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => saveRename(s.id)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename(s.id)}
                    onClick={e => e.stopPropagation()}
                    className="
                      bg-white text-black border-2 border-black p-1 rounded
                      w-full text-xs font-bold
                    "
                  />
                ) : (
                  <span className="font-black text-sm truncate flex-1">
                    {s.title}
                  </span>
                )}

                <div className="flex gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenaming(e, s);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-500"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={(e) => deleteSession(e, s.id)}
                    className="hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* FOOTER BUTTONS */}
        <div className="p-4 border-t-4 border-[var(--border-color)] bg-[var(--component-bg)]">
          <div className="grid grid-cols-2 gap-3">

            {/* SAVE */}
            <button
              onClick={handleExportToon}
              className="
                flex items-center justify-center gap-2
                text-xs font-black uppercase
                p-3 rounded bg-yellow-300 text-black
                border-4 border-[var(--border-color)]
                shadow-hard-sm hover:shadow-none transition-all
              "
            >
              <Download size={16} /> Save
            </button>

            {/* LOAD */}
            <button
              onClick={() => fileInputRef.current.click()}
              className="
                flex items-center justify-center gap-2
                text-xs font-black uppercase
                p-3 rounded bg-green-300 text-black
                border-4 border-[var(--border-color)]
                shadow-hard-sm hover:shadow-none transition-all
              "
            >
              <Upload size={16} /> Load
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportToon}
              accept=".toon"
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative overflow-x-hidden min-w-0">
        {/* Header - Z-10 */}
        <header className="bg-[var(--component-bg)] border-b-4 border-[var(--border-color)] h-16 flex justify-between items-center px-4 shadow-sm z-10 flex-shrink-0">
            <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0">
                <button onClick={() => setShowSidebar(!showSidebar)}><Menu/></button>
                <h1 className="font-black text-xl md:text-2xl uppercase tracking-tight flex-1 min-w-0 truncate">{sessions.find(s => s.id === currentSessionId)?.title}</h1>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => {
                    setUseFullContext(!useFullContext);
                    logAction('UI_TOGGLE_CONTEXT', { useFullContext: !useFullContext }); // Log context toggle
                }} className={`hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-black border-2 border-[var(--border-color)] rounded shadow-hard-sm hover:shadow-none transition-all uppercase ${useFullContext ? 'bg-pink-400 text-black' : 'bg-emerald-400 text-black'}`}>
                    {useFullContext ? <Brain size={14} /> : <Zap size={14} />} <span>{useFullContext ? 'FULL' : 'ECO'}</span>
                </button>

                <div title={`DB: ${dbStatus}`} className={`w-4 h-4 rounded-full border-2 border-black ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <button onClick={() => setIsConfiguring(true)} className="hover:rotate-90 transition-transform"><Settings size={28}/></button>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-0">
            {currentSessionMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] p-4 border-4 border-[var(--border-color)] rounded-lg text-base font-medium shadow-hard ${msg.role === 'user' ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--component-bg)]'} break-words`}>
                        <div className="font-black text-xs mb-2 opacity-80 flex items-center gap-1 uppercase tracking-widest border-b-2 border-current pb-1 w-fit">
                            {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>} {msg.role}
                        </div>
                        <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown></div>
                    </div>
                </div>
            ))}
            {toolStatus && <div className="flex justify-start"><div className="bg-yellow-300 border-2 border-black rounded p-3 text-sm font-black flex gap-2 animate-bounce text-black shadow-hard"><Wrench size={18}/> {toolStatus}</div></div>}
            {isLoading && !toolStatus && <div className="flex justify-start"><div className="bg-[var(--component-bg)] border-2 border-[var(--border-color)] rounded-lg p-4 shadow-hard flex gap-2"><div className="w-3 h-3 bg-[var(--text-color)] animate-bounce"></div><div className="w-3 h-3 bg-[var(--text-color)] animate-bounce delay-75"></div><div className="w-3 h-3 bg-[var(--text-color)] animate-bounce delay-150"></div></div></div>}
            <div ref={messagesEndRef} />
        </div>

        {/* Footer Input - Z-10 */}
        <div className="bg-[var(--component-bg)] border-t-4 border-[var(--border-color)] p-6 z-10 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex gap-3 relative">
                <div className="relative flex items-center z-50">
                    <button onClick={() => handleForceToolChange(forcedTool === 'auto' ? null : 'auto')} className={`p-3 border-4 border-[var(--border-color)] shadow-hard hover:shadow-none transition-all ${forcedTool && forcedTool !== 'auto' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-black'}`} title="Ép dùng Tool (Click để chọn)"><Wrench size={24}/></button>
                    {forcedTool === 'auto' && (
                        // Dropdown menu for tool selection
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border-4 border-black shadow-hard flex flex-col z-50 overflow-hidden">
                            <button onClick={() => handleForceToolChange('search_memory')} className="p-3 hover:bg-gray-200 text-left text-xs font-black border-b border-black flex items-center gap-2">🔍 Tìm Ký Ức <Brain size={12} /></button>
                            <button onClick={() => handleForceToolChange('change_theme_color')} className="p-3 hover:bg-gray-200 text-left text-xs font-black border-b border-black flex items-center gap-2">🎨 Đổi Màu <Palette size={12} /></button>
                            <button onClick={() => handleForceToolChange('get_weather')} className="p-3 hover:bg-gray-200 text-left text-xs font-black border-b border-black flex items-center gap-2">🌤️ Thời Tiết <CloudSun size={12} /></button>
                            <button onClick={() => handleForceToolChange('get_app_insights')} className="p-3 hover:bg-gray-200 text-left text-xs font-black border-b border-black flex items-center gap-2">📊 App Insights <BarChart3 size={12} /></button>
                            <button onClick={() => handleForceToolChange(null)} className="p-3 hover:bg-gray-200 text-left text-xs font-black text-red-600 flex items-center gap-2 border-t-2 border-red-300"><X size={12} /> Hủy Bỏ</button>
                        </div>
                    )}
                </div>
                {/* 🟣 BẢN NÂNG CẤP TEXTAREA AUTO-RESIZE */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);

                    // AUTO-RESIZE LOGIC
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 180) + "px"; // max height 180px
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    forcedTool && forcedTool !== "auto"
                      ? `[CHẾ ĐỘ ÉP TOOL]: ${forcedTool}...`
                      : "Nhập tin nhắn..."
                  }
                  disabled={isLoading}
                  className="
                    flex-1 resize-none
                    border-4 border-[var(--border-color)]
                    p-3 text-lg font-bold
                    rounded-lg shadow-hard
                    bg-[var(--app-bg)] placeholder-[var(--text-color)]/50
                    focus:outline-none focus:shadow-none focus:translate-y-[2px]
                    leading-snug
                    max-h-[180px]
                    overflow-y-auto
                    transition-all
                  "
                  rows={1}
                />
                <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="bg-[var(--accent-color)] text-white border-4 border-[var(--border-color)] px-8 shadow-hard hover:shadow-none hover:translate-y-1 font-black uppercase tracking-widest"><Send size={24}/></button>
            </div>
        </div>
      </div>
    </div>
  );
}
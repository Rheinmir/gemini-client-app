import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbPromise = open({
  filename: '/app/data/chat.db',
  driver: sqlite3.Database
});

const initDb = async () => {
  try {
    const db = await dbPromise;
    await db.exec(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, title TEXT, messages TEXT, provider TEXT DEFAULT 'gemini', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    const defaultTheme = JSON.stringify({ appBg: '#bfdbfe', sidebarBg: '#ffffff', componentBg: '#ffffff', accentColor: '#3b82f6', textColor: '#000000', borderColor: '#000000', shadowColor: '#000000' });
    await db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', ?)`, defaultTheme);
    console.log("✅ Database Ready");
  } catch (err) { console.error("❌ DB Error:", err); }
};
initDb();

// --- API ROUTES ---
app.get('/api/weather', async (req, res) => {
    const { city, key } = req.query;
    let debugLogs = []; // Ghi lại hành trình debug

    if (!city) return res.status(400).json({ error: "Thiếu tên thành phố" });

    debugLogs.push(`Request City: ${city}`);

    // 1. Thử OpenWeatherMap (Nếu có key)
    if (key && key !== 'null' && key !== '') {
        debugLogs.push("Attempting OpenWeatherMap...");
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric&lang=vi`;
            debugLogs.push(`OWM URL (masked): ...data/2.5/weather?q=${city}...`);
            
            const resp = await fetch(url);
            const data = await resp.json();

            if (data.cod === 200) {
                return res.json({
                    source: "OpenWeatherMap",
                    location: `${data.name}, ${data.sys.country}`,
                    temperature: data.main.temp,
                    feels_like: data.main.feels_like,
                    description: data.weather[0].description,
                    humidity: data.main.humidity,
                    wind_speed: data.wind.speed,
                    icon: `http://openweathermap.org/img/w/${data.weather[0].icon}.png`
                });
            }
            debugLogs.push(`OWM Failed. Code: ${data.cod}, Message: ${data.message}`);
        } catch (err) { 
            debugLogs.push(`OWM Network Error: ${err.message}`); 
        }
    } else {
        debugLogs.push("OWM Skipped: No API Key provided.");
    }

    // 2. Fallback Open-Meteo (Miễn phí)
    debugLogs.push("Attempting Open-Meteo (Fallback)...");
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            debugLogs.push(`Geocoding Failed: No results for '${city}'`);
            // TRẢ VỀ LỖI CHI TIẾT ĐỂ BOT ĐỌC
            return res.json({ 
                error: "Không tìm thấy địa điểm.", 
                details: debugLogs 
            });
        }
        
        const { latitude, longitude, name, country } = geoData.results[0];
        debugLogs.push(`Geocoding Success: ${name} (${latitude}, ${longitude})`);

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        const current = weatherData.current;
        
        const weatherCodeMap = {
            0: "Trời quang", 1: "Có mây", 2: "Nhiều mây", 3: "U ám", 45: "Sương mù", 
            51: "Mưa phùn", 61: "Mưa nhỏ", 63: "Mưa vừa", 65: "Mưa to", 
            80: "Mưa rào", 95: "Dông bão"
        };

        res.json({
            source: "Open-Meteo (Free)",
            location: `${name}, ${country}`,
            temperature: current.temperature_2m,
            feels_like: current.apparent_temperature,
            description: weatherCodeMap[current.weather_code] || `Mã: ${current.weather_code}`,
            humidity: current.relative_humidity_2m,
            wind_speed: current.wind_speed_10m,
            debug_trace: debugLogs // Gửi kèm log thành công để check
        });
    } catch (err) { 
        debugLogs.push(`Open-Meteo Error: ${err.message}`);
        // Trả về lỗi cuối cùng kèm full log
        res.status(500).json({ 
            error: "Thất bại toàn tập.", 
            details: debugLogs 
        }); 
    }
});

app.get('/api/settings/theme', async (req, res) => {
    try {
        const db = await dbPromise;
        const row = await db.get("SELECT value FROM settings WHERE key = 'theme'");
        res.json(row ? JSON.parse(row.value) : {});
    } catch (err) { res.status(500).json({}); }
});

app.post('/api/settings/theme', async (req, res) => {
    try {
        const db = await dbPromise;
        await db.run(`INSERT INTO settings (key, value) VALUES ('theme', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, JSON.stringify(req.body));
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const db = await dbPromise;
    const sessions = await db.all('SELECT * FROM sessions ORDER BY updated_at DESC');
    res.json(sessions.map(s => ({ ...s, messages: JSON.parse(s.messages) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions', async (req, res) => {
  const { id, title, messages, provider } = req.body;
  try {
    const db = await dbPromise;
    await db.run(
      `INSERT INTO sessions (id, title, messages, provider, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET title=excluded.title, messages=excluded.messages, provider=excluded.provider, updated_at=CURRENT_TIMESTAMP`,
      [id, title, JSON.stringify(messages), provider || 'gemini']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/sessions/:id/title', async (req, res) => {
    const { title } = req.body;
    try {
        const db = await dbPromise;
        await db.run('UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const db = await dbPromise;
    await db.run('DELETE FROM sessions WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const db = await dbPromise;
    const results = await db.all(`SELECT title, messages, updated_at FROM sessions WHERE messages LIKE ? ORDER BY updated_at DESC LIMIT 5`, [`%${q}%`]);
    const refinedResults = results.map(row => {
        const msgs = JSON.parse(row.messages);
        const relevantMsgs = msgs.filter(m => m.text.toLowerCase().includes(q.toLowerCase()));
        return { source_session: row.title, date: row.updated_at, snippets: relevantMsgs.map(m => `[${m.role}]: ${m.text}`).join(" | ") };
    });
    res.json(refinedResults);
  } catch (err) { res.status(500).json([]); }
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, '../dist/index.html')); });
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Server running on port ${PORT}`); });
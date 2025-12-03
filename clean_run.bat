@echo off
echo 🧹 Cleaning...
docker stop gemini-toon-chat
docker rm gemini-toon-chat
docker rmi gemini-toon-chat
echo 🚀 Building...
docker build -t gemini-toon-chat .
echo ▶️ Running...
docker run -d --name gemini-toon-chat -p 1060:3000 -v /Users/giatran/gemini-data:/app/data gemini-toon-chat
echo ✅ DONE: http://localhost:1060
pause
#!/bin/bash
echo "🧹 Cleaning..."
mkdir -p /Users/giatran/gemini-data
docker stop gemini-toon-chat || true
docker rm gemini-toon-chat || true
docker rmi gemini-toon-chat || true
echo "🚀 Building..."
docker build -t gemini-toon-chat .
echo "▶️ Running (Port 1060)..."
docker run -d --name gemini-toon-chat \
    -p 1060:3000 \
    -v /Users/giatran/gemini-data:/app/data \
    gemini-toon-chat
echo "✅ DONE: http://localhost:1060"
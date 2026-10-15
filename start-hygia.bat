@echo off
echo ====================================================
echo Starting HYGIA AI Personal Health Copilot...
echo ====================================================

start "HYGIA FastAPI Backend" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"
timeout /t 2 >nul
start "" http://localhost:5500/login.html
cd /d %~dp0frontend
..\.venv\Scripts\python.exe -m http.server 5500 --bind 127.0.0.1

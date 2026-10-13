@echo off
cd /d D:\HYGIA-\frontend
start "" http://localhost:5500/
python -m http.server 5500 --bind 127.0.0.1
pause

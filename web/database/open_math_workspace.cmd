@echo off
setlocal
cd /d "%~dp0"
set "PORT=8765"
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if errorlevel 1 (
  where py >nul 2>nul
  if not errorlevel 1 (start "Math Workspace server" /min py -m http.server %PORT% --bind 127.0.0.1) else (
    where python >nul 2>nul
    if errorlevel 1 (echo Python is required. & pause & exit /b 1)
    start "Math Workspace server" /min python -m http.server %PORT% --bind 127.0.0.1
  )
  timeout /t 1 /nobreak >nul
)
start "" "http://127.0.0.1:%PORT%/math_workspace.html"

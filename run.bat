@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ألعاب الكاميرا للأطفال 🎪
echo ============================================
echo   ألعاب الكاميرا للأطفال 🎪
echo   من الكمبيوتر:  http://127.0.0.1:8690
echo ============================================
for /f "tokens=2 delims=:" %%a in ('netsh interface ip show address ^| findstr /i "IP Address"') do (
    for /f "tokens=* delims= " %%b in ("%%a") do echo   من الجوال (نفس الواي فاي، تحتاج HTTPS): http://%%b:8690
)
echo.
echo   الأفضل للجوال: شغّل tunnel.bat للحصول على رابط HTTPS
echo   اضغط Ctrl+C للايقاف
echo.
start "" "http://127.0.0.1:8690"

set PY=
python --version >nul 2>&1 && set PY=python
if not defined PY ( py --version >nul 2>&1 && set PY=py )
if not defined PY ( "C:\Users\Temp\AppData\Local\Programs\Python\Python312\python.exe" --version >nul 2>&1 && set PY=C:\Users\Temp\AppData\Local\Programs\Python\Python312\python.exe )
if not defined PY (
    echo [خطأ] لم يتم العثور على Python! ثبّته من python.org ثم أعد المحاولة
    pause
    exit /b 1
)
%PY% -m http.server 8690 --bind 0.0.0.0

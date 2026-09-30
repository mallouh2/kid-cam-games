@echo off
chcp 65001 >nul
title ألعاب الكاميرا - نفق HTTPS للجوال
echo ================================================
echo   نفق HTTPS مجاني (بدون حساب) عبر localhost.run
echo   افتح الرابط الذي سيظهر من جوالك مباشرة
echo   (كاميرا الجوال تعمل فقط عبر HTTPS)
echo ================================================
echo.
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:8690 nokey@localhost.run
echo.
echo انقطع النفق. اضغط أي مفتاح للمحاولة من جديد...
pause >nul

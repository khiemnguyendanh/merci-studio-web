@echo off
chcp 65001 >nul
title Cap nhat anh Merci Studio
cd /d "%~dp0"

echo(
echo ============================================================
echo    CAP NHAT ANH LEN WEBSITE MERCI STUDIO
echo ============================================================
echo(
echo  Nguon anh:  E:\Mau\ANH WEB
echo  Cach dung:  Bo anh moi vao thu muc tren, roi chay file nay.
echo(
echo ------------------------------------------------------------
echo  [1/2] Dang nen anh moi (bo qua anh da co)...
echo ------------------------------------------------------------
call node scripts\build-photos.mjs
if errorlevel 1 goto loi

echo(
echo ------------------------------------------------------------
echo  [2/2] Dang dua len Cloudflare (vui long doi vai phut)...
echo ------------------------------------------------------------
call npm run deploy
if errorlevel 1 goto loi

echo(
echo ============================================================
echo    HOAN TAT! Website da cap nhat anh moi.
echo    Mo mercistudio.net de kiem tra.
echo ============================================================
echo(
pause
exit /b 0

:loi
echo(
echo ############################################################
echo    CO LOI XAY RA - anh CHUA duoc cap nhat.
echo    Chup lai man hinh nay va gui cho ky thuat.
echo ############################################################
echo(
pause
exit /b 1
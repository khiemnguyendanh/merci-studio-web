@echo off
chcp 65001 >nul
title Dong bo anh cho tu Drive - Merci Studio
cd /d "%~dp0"

echo(
echo ============================================================
echo    DONG BO ANH CON CHO (HEIC / anh web chua nen duoc)
echo ============================================================
echo(
echo  Nut "Dong bo Drive - R2" tren web tu nen va dua anh len ngay.
echo  Anh nao web khong nen duoc (HEIC...) se nam trong hang cho,
echo  file nay tai anh goc ve may, nen roi dua len web.
echo(
call node scripts\drive-pending.mjs
if errorlevel 1 goto loi

echo(
echo ============================================================
echo    HOAN TAT! Mo mercistudio.net de kiem tra (Ctrl+F5).
echo ============================================================
echo(
pause
exit /b 0

:loi
echo(
echo ############################################################
echo    CO LOI XAY RA - mot so anh CHUA len web (van con trong hang cho).
echo    Neu bao "Token Cloudflare het han": mo cmd tai thu muc nay,
echo    chay  npx wrangler login  roi chay lai file nay.
echo ############################################################
echo(
pause
exit /b 1

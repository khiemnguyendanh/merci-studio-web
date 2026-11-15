@echo off
chcp 65001 >nul
title Quet nhom mat cho trang chon anh
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8

echo(
echo ============================================================
echo    QUET NHOM MAT CHO TRANG CHON ANH
echo ============================================================
echo(
echo  Dung sau khi da tao trang chon anh cho khach.
echo  Dan link folder Google Drive cua trang do (moi dong 1 link).
echo  Xong roi khach vao trang se co thanh "Loc theo nguoi".
echo(
echo  Folder phai de quyen: Bat ky ai co lien ket deu xem duoc.
echo  Khoang 500 anh mat ~5 phut.
echo(

if not "%~1"=="" goto chay

set /p LINKS=Dan link folder Drive: 
if "%LINKS%"=="" goto thoat
call python scripts\face-groups.py %LINKS%
if errorlevel 1 goto loi
goto xong

:chay
call python scripts\face-groups.py %*
if errorlevel 1 goto loi

:xong
echo(
echo ============================================================
echo    HOAN TAT! Mo lai trang chon anh de kiem tra.
echo ============================================================
echo(
pause
exit /b 0

:thoat
echo Chua nhap link. Thoat.
pause
exit /b 0

:loi
echo(
echo ############################################################
echo    CO LOI XAY RA.
echo    Neu bao "Token Cloudflare het han": mo cmd tai thu muc nay,
echo    chay  npx wrangler login  roi chay lai file nay.
echo    Chup lai man hinh nay va gui cho ky thuat.
echo ############################################################
echo(
pause
exit /b 1

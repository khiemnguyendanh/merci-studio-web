@echo off
chcp 65001 >nul
title Cai agent quet mat
cd /d "%~dp0"

echo(
echo ============================================================
echo    CAI AGENT QUET MAT (chay nen, tu khoi dong cung Windows)
echo ============================================================
echo(
echo  Sau khi cai, bam nut "Quet mat" tren web la may tu quet,
echo  ke ca khi khong ai ngoi truoc may (may phai dang bat).
echo(

if not exist ".cache\face-agent.json" goto nhapkhoa
findstr /c:"\"key\"" ".cache\face-agent.json" >nul && goto task

:nhapkhoa
set /p KHOA=Nhap khoa FACE_AGENT_KEY: 
if "%KHOA%"=="" goto huy
call node scripts\face-agent.mjs --set-key "%KHOA%"
if errorlevel 1 goto loi

:task
schtasks /Create /TN "Merci Face Agent" /SC ONLOGON /RL LIMITED /F /TR "cmd /c cd /d \"%~dp0\" && node scripts\face-agent.mjs >> .cache\face-agent.log 2>&1"
if errorlevel 1 goto loi
schtasks /Run /TN "Merci Face Agent" >nul 2>&1

echo(
echo ============================================================
echo    DA CAI. Agent dang chay va se tu bat khi dang nhap Windows.
echo    Xem log: .cache\face-agent.log
echo    Go bo: schtasks /Delete /TN "Merci Face Agent" /F
echo ============================================================
echo(
pause
exit /b 0

:huy
echo Chua nhap khoa. Thoat.
pause
exit /b 0

:loi
echo(
echo ############################################################
echo    CO LOI. Chay file nay bang tai khoan Windows binh thuong
echo    (khong can quyen Administrator).
echo ############################################################
echo(
pause
exit /b 1

@echo off
chcp 65001 >nul
title Cap nhat anh Merci Studio tu Google Drive
cd /d "%~dp0"

echo(
echo ============================================================
echo    CAP NHAT ANH LEN WEBSITE TU GOOGLE DRIVE
echo ============================================================
echo(
echo  Folder Drive phai de quyen: Bat ky ai co lien ket deu xem duoc.
echo  Folder goc co nhieu thu muc con  = moi thu muc con la 1 album.
echo  Folder chi co anh                = folder do la 1 album.
echo(
echo ------------------------------------------------------------
echo  [1/3] Tai anh tu Drive ve E:\Mau\ANH WEB (bo qua anh da co)...
echo ------------------------------------------------------------
call node scripts\drive-to-folder.mjs %*
if errorlevel 1 goto loi

echo(
echo ------------------------------------------------------------
echo  [2/3] Dang nen anh moi...
echo ------------------------------------------------------------
call node scripts\build-photos.mjs
if errorlevel 1 goto loi

echo(
echo ------------------------------------------------------------
echo  [3/3] Dang dua anh len Cloudflare R2 (chi file moi)...
echo ------------------------------------------------------------
call node scripts\upload-r2.mjs
if errorlevel 1 goto loi

echo(
echo ============================================================
echo    HOAN TAT! Website da cap nhat anh moi.
echo    Mo mercistudio.net de kiem tra (nhan Ctrl+F5 neu chua thay).
echo ============================================================
echo(
pause
exit /b 0

:loi
echo(
echo ############################################################
echo    CO LOI XAY RA - anh CHUA duoc cap nhat.
echo    Neu bao "Token Cloudflare het han": mo cmd tai thu muc nay,
echo    chay  npx wrangler login  roi chay lai file nay.
echo    Chup lai man hinh nay va gui cho ky thuat.
echo ############################################################
echo(
pause
exit /b 1

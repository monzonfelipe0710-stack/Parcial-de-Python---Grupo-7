@echo off
REM Levanta el frontend (app) en http://localhost:5173
cd /d "%~dp0frontend"
echo ============================================
echo  Frontend de Contratos - Acosta ^& Asociados
echo  App: http://localhost:5173
echo ============================================
echo.
npm run dev
pause

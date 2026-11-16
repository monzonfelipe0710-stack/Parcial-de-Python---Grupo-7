@echo off
REM Levanta el backend (API) en http://localhost:8000
cd /d "%~dp0"
echo ============================================
echo  Backend de Contratos - Acosta ^& Asociados
echo  API:      http://localhost:8000
echo  Docs:     http://localhost:8000/docs
echo ============================================
echo.
echo Recorda que Ollama debe estar encendido para el asistente.
echo.
py -3.12 -m uvicorn backend.main:app --reload --port 8000
pause

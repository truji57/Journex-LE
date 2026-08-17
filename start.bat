@echo off
echo Iniciando Journex LE...
echo.

REM Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Por favor, instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Instalar dependencias si no existen
if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
    echo.
)

REM Obtener la IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set "IP=%%a"
    goto :found
)
:found
set "IP=%IP:~1%"

echo ===================================
echo  Journex LE esta listo!
echo ===================================
echo.
echo Accede desde este equipo: http://localhost:5177
echo Accede desde otro equipo en la red: http://%IP%:5177
echo.
echo Presiona Ctrl+C para detener el servidor
echo ===================================
echo.

REM Iniciar el backend
start "Backend" cmd /k "npm run server"

timeout /t 4 >nul

REM Abrir navegador
start http://localhost:5177

REM Iniciar el servidor de desarrollo (frontend)
call npm run dev

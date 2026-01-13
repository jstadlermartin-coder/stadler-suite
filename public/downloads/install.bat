@echo off
chcp 65001 >nul
title CapCorn Bridge Installer

echo ============================================================
echo   CapCorn Bridge - Automatische Installation
echo   Hotel Stadler - Datenbank-Synchronisation
echo ============================================================
echo.

:: Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Python ist nicht installiert!
    echo.
    echo Bitte Python installieren von: https://www.python.org/downloads/
    echo Wichtig: "Add Python to PATH" aktivieren!
    echo.
    pause
    exit /b 1
)

echo [OK] Python gefunden
echo.

:: Create installation folder
set INSTALL_DIR=%USERPROFILE%\CapCorn-Bridge
echo Installation nach: %INSTALL_DIR%
echo.

if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    echo [OK] Ordner erstellt
) else (
    echo [OK] Ordner existiert bereits
)

:: Copy files
echo.
echo Kopiere Dateien...
copy /Y "%~dp0capcorn_bridge.py" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0capcorn_bridge_gui.py" "%INSTALL_DIR%\" >nul
echo [OK] Dateien kopiert

:: Install Python dependencies
echo.
echo Installiere Python-Pakete...
pip install flask flask-cors pyodbc firebase-admin pystray pillow --quiet
if errorlevel 1 (
    echo [WARNUNG] Einige Pakete konnten nicht installiert werden
) else (
    echo [OK] Pakete installiert
)

:: Create default config
echo.
echo Erstelle Konfiguration...
(
echo {
echo   "database_path": "C:\\datat\\caphotel.mdb",
echo   "port": 5000,
echo   "host": "127.0.0.1",
echo   "debug": false,
echo   "auto_start": true,
echo   "auto_sync": true,
echo   "sync_interval": 15,
echo   "firebase_project_id": "stadler-suite",
echo   "minimize_to_tray": true,
echo   "start_minimized": false,
echo   "backup_enabled": true,
echo   "backup_interval": 6
echo }
) > "%INSTALL_DIR%\config.json"
echo [OK] Konfiguration erstellt

:: Create desktop shortcut
echo.
echo Erstelle Desktop-Verknuepfung...
set SHORTCUT=%USERPROFILE%\Desktop\CapCorn Bridge.lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'pythonw'; $s.Arguments = '\"%INSTALL_DIR%\capcorn_bridge_gui.py\"'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'CapCorn Bridge - Hotel Stadler'; $s.Save()"
echo [OK] Desktop-Verknuepfung erstellt

echo.
echo ============================================================
echo   Installation abgeschlossen!
echo ============================================================
echo.
echo Naechste Schritte:
echo 1. Google Cloud CLI installieren (fuer Firebase-Sync)
echo    https://cloud.google.com/sdk/docs/install
echo.
echo 2. Einmalig authentifizieren:
echo    gcloud auth application-default login
echo.
echo 3. Bridge starten:
echo    - Desktop-Verknuepfung "CapCorn Bridge" doppelklicken
echo    - Oder: python "%INSTALL_DIR%\capcorn_bridge_gui.py"
echo.
echo 4. Datenbank-Pfad in den Einstellungen anpassen
echo    (Standard: C:\datat\caphotel.mdb)
echo.
pause

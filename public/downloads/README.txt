============================================================
  CapCorn Bridge v4.1
  Hotel Stadler - Datenbank-Synchronisation & Backup
============================================================

BESCHREIBUNG
------------
Die CapCorn Bridge verbindet Ihre lokale CapHotel-Datenbank
(Access .mdb) mit der Stadler Suite Web-App.

Funktionen:
- REST API fuer Datenzugriff
- Automatische Synchronisation zu Firebase (Cloud)
- Automatisches Datenbank-Backup
- System-Tray mit Schnellzugriff
- Windows-Autostart


SCHNELL-INSTALLATION (EXE)
--------------------------
1. CapCornBridge.exe herunterladen
2. firebase-key.json vom Admin erhalten
3. Beide Dateien in den CapCorn-Ordner kopieren (z.B. C:\datat\)
4. Doppelklick auf CapCornBridge.exe
5. Datenbank-Pfad in Einstellungen setzen
6. Fertig!


ORDNERSTRUKTUR
--------------
C:\datat\
├── caphotel.mdb          # CapCorn Datenbank
├── CapCornBridge.exe     # Bridge (DIESE Datei)
├── firebase-key.json     # Firebase Service Account Key
├── config.json           # Wird automatisch erstellt
└── backups\              # Backup-Ordner


FIREBASE KEY ERSTELLEN (nur Admin)
----------------------------------
1. Firebase Console oeffnen: https://console.firebase.google.com
2. Projekt "stadler-suite" waehlen
3. Projekteinstellungen → Dienstkonten
4. "Neuen privaten Schluessel generieren"
5. JSON-Datei herunterladen
6. Umbenennen zu "firebase-key.json"
7. Datei sicher an Hotel-PC uebertragen


PYTHON-INSTALLATION (optional, fuer Entwickler)
-----------------------------------------------
1. Python 3.8+ installieren
   https://www.python.org/downloads/

2. install.bat doppelklicken
   ODER manuell: pip install flask flask-cors pyodbc firebase-admin pystray pillow

3. python capcorn_bridge_gui.py starten


KONFIGURATION
-------------
Die config.json wird automatisch erstellt.
Wichtig: Datenbank-Pfad anpassen!

{
  "database_path": "C:\\datat\\caphotel.mdb",
  "port": 5000,
  "auto_sync": true,
  "sync_interval": 15,
  "backup_enabled": true,
  "backup_interval": 6
}


API ENDPOINTS
-------------
GET  /rooms              - Alle Zimmer
GET  /guests             - Gaeste suchen
GET  /guests/{id}        - Gast mit Mitreisenden
PUT  /guest/{id}         - Gast aktualisieren
GET  /bookings           - Buchungen
GET  /invoices           - Rechnungen
GET  /backup/status      - Backup-Status
POST /backup/now         - Backup erstellen

Vollstaendige Dokumentation: http://localhost:5000/


SUPPORT
-------
Web-App: https://stadler-suite.web.app
GitHub:  https://github.com/jstadlermartin-coder/stadler-suite


(c) 2024-2025 Hotel Stadler am Attersee

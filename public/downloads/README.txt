============================================================
  CapCorn Bridge v4.0
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


SCHNELL-INSTALLATION
--------------------
1. install.bat doppelklicken
2. Fertig!


MANUELLE INSTALLATION
---------------------
1. Python 3.8+ installieren
   https://www.python.org/downloads/
   WICHTIG: "Add Python to PATH" aktivieren!

2. Ordner erstellen:
   C:\Users\[Name]\CapCorn-Bridge\

3. Dateien kopieren:
   - capcorn_bridge.py
   - capcorn_bridge_gui.py

4. Pakete installieren (CMD):
   pip install flask flask-cors pyodbc firebase-admin pystray pillow

5. Google Cloud CLI installieren (fuer Firebase):
   https://cloud.google.com/sdk/docs/install

6. Authentifizieren (einmalig):
   gcloud auth application-default login

7. Bridge starten:
   python capcorn_bridge_gui.py


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

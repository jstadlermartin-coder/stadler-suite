# -*- coding: utf-8 -*-
"""
CapCorn Bridge - REST API for CapCorn Hotel Database
=====================================================
Ermoeglicht Zugriff auf die CapCorn Access-Datenbank via HTTP/JSON.

Endpoints:
----------
GET  /                      - API Status
GET  /rooms                 - Alle Zimmer
GET  /rooms/<zimm>          - Ein Zimmer
GET  /categories            - Alle Kategorien
GET  /availability          - Verfuegbare Zimmer pruefen
GET  /bookings              - Buchungen auflisten
GET  /bookings/<resn>       - Eine Buchung
GET  /guests                - Gaeste suchen
GET  /guests/<gast>         - Ein Gast
GET  /account/<resn>        - Kontobuchungen einer Reservierung
GET  /articles              - Alle Artikel/Leistungen
GET  /channels              - Alle Buchungskanaele
GET  /calendar              - Belegungskalender
GET  /stats                 - Statistiken

POST   /option              - Neue Option anlegen
PUT    /book/<resn>         - Option zur Buchung wandeln
DELETE /cancel/<resn>       - Buchung stornieren
POST   /guest               - Neuen Gast anlegen
PUT    /guest/<gast>        - Gast aktualisieren
POST   /service             - Leistung auf Konto buchen

BLOCKIERUNG (Kalender-Sichtbar):
---------------------------------
POST   /block               - Zeitraum blockieren (stat=0, flgl=4)
DELETE /block/<resn>        - Blockierung entfernen

BUCHUNG MIT WEBAPP-PREISEN:
---------------------------
POST   /booking-with-price  - Buchung mit Preisen aus Webapp erstellen
                             (Positionen oder Pauschale)

CHECK-IN / CHECK-OUT:
---------------------
PUT  /checkin/<resn>        - Zimmer einchecken (setzt BUZ.ckin = 2)
PUT  /checkout/<resn>       - Zimmer auschecken (setzt BUZ.ckin = 4)
GET  /checkin-status/<resn> - Check-in Status abfragen

GAESTEANMELDUNG (Meldewesen):
-----------------------------
GET  /registrations/<resn>  - Anmeldungen einer Buchung
POST /register/<resn>       - Gast anmelden (ANM.stat = 6)
PUT  /deregister/<annr>     - Gast abmelden (ANM.stat = 4)

RECHNUNGEN:
-----------
GET  /invoices              - Rechnungen auflisten
GET  /invoices/<rnum>       - Eine Rechnung mit Positionen
GET  /invoices/by-booking/<resn> - Rechnungen zu einer Buchung
GET  /invoices/open         - Offene (unbezahlte) Rechnungen
GET  /invoices/stats        - Umsatz-Statistiken
GET  /invoices/by-payment-type - Umsatz nach Zahlart
GET  /invoices/by-month     - Umsatz nach Monat
GET  /invoices/by-year      - Umsatz nach Jahr
GET  /payment-types         - Alle Zahlarten

BACKUP AGENT:
-------------
GET  /backup/status         - Backup-Status abfragen
POST /backup/now            - Sofort-Backup ausloesen
GET  /backup/list           - Alle Backups auflisten
POST /backup/restore/<file> - Backup wiederherstellen
DELETE /backup/delete/<file> - Backup loeschen
GET  /backup/settings       - Backup-Einstellungen
PUT  /backup/settings       - Einstellungen aendern
POST /backup/cleanup        - Alte Backups aufraeumen

(c) 2024-2025 - Hotel Stadler Bridge
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc
import json
import os
from datetime import datetime, timedelta
from functools import wraps

# ============================================================================
# CONFIGURATION
# ============================================================================

# Config laden
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "database_path": "C:\\datat\\caphotel.mdb",
        "port": 5000,
        "host": "0.0.0.0",
        "debug": False,
        "log_level": "INFO"
    }

config = load_config()

# Flask App
app = Flask(__name__)
CORS(app)  # Cross-Origin fuer Web-Apps erlauben

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

def get_db():
    """Verbindung zur Access-Datenbank herstellen"""
    conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={config['database_path']}"
    return pyodbc.connect(conn_str)

def db_query(query, params=None, fetchone=False):
    """Datenbank-Query ausfuehren und Ergebnis als Liste von Dicts zurueckgeben"""
    conn = get_db()
    cursor = conn.cursor()

    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)

    # Spaltennamen holen
    columns = [column[0] for column in cursor.description] if cursor.description else []

    if fetchone:
        row = cursor.fetchone()
        result = dict(zip(columns, row)) if row else None
    else:
        rows = cursor.fetchall()
        result = [dict(zip(columns, row)) for row in rows]

    conn.close()
    return result

def db_execute(query, params=None):
    """Datenbank-Query ausfuehren (INSERT, UPDATE, DELETE)"""
    conn = get_db()
    cursor = conn.cursor()

    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)

    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected

def serialize_row(row):
    """Konvertiert Datenbankzeile zu JSON-serialisierbarem Dict"""
    result = {}
    for key, value in row.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat() if value.year > 1900 else None
        else:
            result[key] = value
    return result

# ============================================================================
# ERROR HANDLING
# ============================================================================

@app.errorhandler(Exception)
def handle_error(e):
    return jsonify({
        "error": True,
        "message": str(e),
        "type": type(e).__name__
    }), 500

# ============================================================================
# ROUTES - STATUS
# ============================================================================

@app.route('/')
def index():
    """API Status und Info"""
    return jsonify({
        "name": "CapCorn Bridge API",
        "version": "1.0.0",
        "status": "running",
        "database": config['database_path'],
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "rooms": "/rooms",
            "categories": "/categories",
            "availability": "/availability?from=YYYY-MM-DD&to=YYYY-MM-DD",
            "bookings": "/bookings",
            "guests": "/guests",
            "articles": "/articles",
            "channels": "/channels",
            "calendar": "/calendar?month=MM&year=YYYY",
            "stats": "/stats",
            "checkin": "/checkin/<resn> (PUT)",
            "checkout": "/checkout/<resn> (PUT)",
            "checkin_status": "/checkin-status/<resn>",
            "registrations": "/registrations/<resn>",
            "register": "/register/<resn> (POST)",
            "deregister": "/deregister/<annr> (PUT)",
            "invoices": "/invoices",
            "invoice": "/invoices/<rnum>",
            "invoices_by_booking": "/invoices/by-booking/<resn>"
        }
    })

@app.route('/health')
def health():
    """Health-Check fuer Monitoring"""
    try:
        conn = get_db()
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

# ============================================================================
# ROUTES - ZIMMER
# ============================================================================

@app.route('/rooms')
def get_rooms():
    """Alle Zimmer auflisten"""
    query = """
        SELECT zimm, beze, bett, stat, catg, betm, maxv, type
        FROM ZIM
        ORDER BY zimm
    """
    rooms = db_query(query)
    return jsonify({
        "count": len(rooms),
        "rooms": [serialize_row(r) for r in rooms]
    })

@app.route('/rooms/<int:zimm>')
def get_room(zimm):
    """Ein Zimmer abrufen"""
    query = "SELECT * FROM ZIM WHERE zimm = ?"
    room = db_query(query, (zimm,), fetchone=True)
    if room:
        return jsonify(serialize_row(room))
    return jsonify({"error": "Zimmer nicht gefunden"}), 404

# ============================================================================
# ROUTES - KATEGORIEN
# ============================================================================

@app.route('/categories')
def get_categories():
    """Alle Zimmerkategorien"""
    query = """
        SELECT catg, beze, bez1, bett, type, betm, maxv, maxe,
               prwa, prwb, prwc, prwd, prwe,
               prsa, prsb, prsc, prsd, prse
        FROM CAT
        ORDER BY catg
    """
    categories = db_query(query)
    return jsonify({
        "count": len(categories),
        "categories": [serialize_row(c) for c in categories]
    })

# ============================================================================
# ROUTES - VERFUEGBARKEIT
# ============================================================================

@app.route('/availability')
def check_availability():
    """
    Verfuegbare Zimmer fuer Zeitraum pruefen

    Query-Parameter:
    - from: Startdatum (YYYY-MM-DD)
    - to: Enddatum (YYYY-MM-DD)
    - category: (optional) Kategorie-ID
    - persons: (optional) Mindest-Personenzahl
    """
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    category = request.args.get('category', type=int)
    persons = request.args.get('persons', type=int)

    if not date_from or not date_to:
        return jsonify({"error": "Parameter 'from' und 'to' erforderlich"}), 400

    # Belegte Zimmer im Zeitraum finden
    query_booked = """
        SELECT DISTINCT zimm FROM BUZ
        WHERE vndt <= ? AND bsdt >= ?
    """
    booked = db_query(query_booked, (date_to, date_from))
    booked_ids = [b['zimm'] for b in booked]

    # Alle Zimmer holen
    query_rooms = """
        SELECT ZIM.zimm, ZIM.beze, ZIM.bett, ZIM.catg, ZIM.betm, ZIM.maxv,
               CAT.beze as kategorie, CAT.prwa, CAT.prsa
        FROM ZIM
        LEFT JOIN CAT ON ZIM.catg = CAT.catg
        WHERE ZIM.stat = 0
    """
    all_rooms = db_query(query_rooms)

    # Freie Zimmer filtern
    available = []
    for room in all_rooms:
        if room['zimm'] in booked_ids:
            continue
        if category and room['catg'] != category:
            continue
        if persons and (room['maxv'] or 2) < persons:
            continue
        available.append(serialize_row(room))

    return jsonify({
        "from": date_from,
        "to": date_to,
        "total_rooms": len(all_rooms),
        "booked": len(booked_ids),
        "available_count": len(available),
        "available": available
    })

# ============================================================================
# ROUTES - BUCHUNGEN
# ============================================================================

@app.route('/bookings')
def get_bookings():
    """
    Buchungen auflisten

    Query-Parameter:
    - from: Ab Datum (YYYY-MM-DD)
    - to: Bis Datum (YYYY-MM-DD)
    - status: Status-Filter
    - channel: Channel-ID
    - limit: Max. Anzahl (default 100)
    """
    limit = request.args.get('limit', 100, type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    status = request.args.get('status', type=int)
    channel = request.args.get('channel', type=int)

    query = f"""
        SELECT TOP {limit} BUC.resn, BUC.gast, BUC.stat, BUC.andf, BUC.ande,
               BUC.chid, BUC.extn, BUC.bdat, BUC.tokn,
               GKT.vorn, GKT.nacn, GKT.mail
        FROM BUC
        LEFT JOIN GKT ON BUC.gast = GKT.gast
        WHERE 1=1
    """
    params = []

    if date_from:
        query += " AND BUC.andf >= ?"
        params.append(date_from)
    if date_to:
        query += " AND BUC.ande <= ?"
        params.append(date_to)
    if status is not None:
        query += " AND BUC.stat = ?"
        params.append(status)
    if channel is not None:
        query += " AND BUC.chid = ?"
        params.append(channel)

    query += " ORDER BY BUC.resn DESC"

    bookings = db_query(query, params if params else None)
    return jsonify({
        "count": len(bookings),
        "bookings": [serialize_row(b) for b in bookings]
    })

@app.route('/bookings/<int:resn>')
def get_booking(resn):
    """Eine Buchung mit Details abrufen"""
    # Buchungs-Kopf
    query_buc = """
        SELECT BUC.*, GKT.vorn, GKT.nacn, GKT.mail, GKT.teln,
               GKT.stra, GKT.polz, GKT.ortb, GKT.land,
               CHC.name as channel_name
        FROM (BUC LEFT JOIN GKT ON BUC.gast = GKT.gast)
        LEFT JOIN CHC ON BUC.chid = CHC.chid
        WHERE BUC.resn = ?
    """
    booking = db_query(query_buc, (resn,), fetchone=True)

    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Zimmer-Details
    query_buz = """
        SELECT BUZ.*, ZIM.beze as zimmer_name
        FROM BUZ
        LEFT JOIN ZIM ON BUZ.zimm = ZIM.zimm
        WHERE BUZ.resn = ?
    """
    rooms = db_query(query_buz, (resn,))

    # Konto-Positionen
    query_akz = """
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ
        LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.resn = ?
    """
    account = db_query(query_akz, (resn,))

    result = serialize_row(booking)
    result['rooms'] = [serialize_row(r) for r in rooms]
    result['account'] = [serialize_row(a) for a in account]
    result['account_total'] = sum(a.get('prei', 0) or 0 for a in account)

    return jsonify(result)

# ============================================================================
# ROUTES - GAESTE
# ============================================================================

@app.route('/guests')
def search_guests():
    """
    Gaeste suchen

    Query-Parameter:
    - q: Suchbegriff (Name, Email)
    - limit: Max. Anzahl (default 50)
    """
    search = request.args.get('q', '')
    limit = request.args.get('limit', 50, type=int)

    query = f"""
        SELECT TOP {limit} gast, vorn, nacn, mail, teln, land, ortb
        FROM GKT
        WHERE vorn LIKE ? OR nacn LIKE ? OR mail LIKE ?
        ORDER BY gast DESC
    """
    search_term = f"%{search}%"
    guests = db_query(query, (search_term, search_term, search_term))

    return jsonify({
        "count": len(guests),
        "guests": [serialize_row(g) for g in guests]
    })

@app.route('/guests/<int:gast>')
def get_guest(gast):
    """
    Einen Gast mit allen Daten und Buchungshistorie abrufen

    Gibt strukturierte Daten zurueck inkl. Mitreisende (Partner + Kinder)
    """
    # Gast-Daten - alle Felder
    query_gkt = "SELECT * FROM GKT WHERE gast = ?"
    guest = db_query(query_gkt, (gast,), fetchone=True)

    if not guest:
        return jsonify({"error": "Gast nicht gefunden"}), 404

    # Buchungshistorie
    query_buc = """
        SELECT resn, andf, ande, stat, chid
        FROM BUC
        WHERE gast = ?
        ORDER BY andf DESC
    """
    bookings = db_query(query_buc, (gast,))

    # Strukturierte Ausgabe mit lesbaren Feldnamen
    result = {
        "gast_id": guest.get('gast'),

        # Stammdaten
        "stammdaten": {
            "vorname": guest.get('vorn'),
            "nachname": guest.get('nacn'),
            "geschlecht": guest.get('gesc'),
            "anrede": guest.get('anre'),
            "titel": guest.get('akad'),
            "geburtsdatum": serialize_date(guest.get('gebg')),
            "nationalitaet": guest.get('nati'),
            "sprache": guest.get('lang'),
            "beruf": guest.get('beru')
        },

        # Kontakt
        "kontakt": {
            "email": guest.get('mail'),
            "email2": guest.get('mad1'),
            "telefon": guest.get('teln'),
            "mobil": guest.get('mobt'),
            "fax": guest.get('faxn'),
            "skype": guest.get('skyp')
        },

        # Adresse
        "adresse": {
            "strasse": guest.get('stra'),
            "plz": guest.get('polz'),
            "ort": guest.get('ortb'),
            "land": guest.get('land')
        },

        # Zusatzinfos
        "zusatzinfos": {
            "notizen": guest.get('noti'),
            "rabatt": guest.get('raba'),
            "typ": guest.get('type'),
            "gruppe": guest.get('grup'),
            "uid_nummer": guest.get('uidn'),
            "b2b_code": guest.get('b2bc'),
            "flag": guest.get('flag')
        },

        # Dokumente (Meldewesen)
        "dokumente": {
            "nationalitaet_cv": guest.get('cvgg'),
            "dokument_nr": guest.get('cvdg'),
            "dokument_datum": serialize_date(guest.get('cvbd')),
            "reisedokument": guest.get('rdoc')
        },

        # Partner/Frau
        "partner": {
            "name": guest.get('frau'),
            "nachname": guest.get('nacf'),
            "geburtsdatum": serialize_date(guest.get('gebf')),
            "geschlecht": guest.get('gesf'),
            "nationalitaet": guest.get('cvgf'),
            "dokument_nr": guest.get('cvdf')
        } if guest.get('frau') else None,

        # Kinder als Liste
        "kinder": [],

        # Freie Attribute
        "attribute": {
            "attr1": guest.get('att1'),
            "attr2": guest.get('att2'),
            "attr3": guest.get('att3'),
            "attr4": guest.get('att4'),
            "attr5": guest.get('att5'),
            "attr6": guest.get('att6'),
            "attr7": guest.get('att7'),
            "attr8": guest.get('att8'),
            "attr9": guest.get('att9'),
            "attr10": guest.get('atta')
        },

        # Buchungshistorie
        "buchungen": [serialize_row(b) for b in bookings],
        "buchungen_anzahl": len(bookings),

        # Raw-Daten (fuer Debugging/Vollzugriff)
        "_raw": serialize_row(guest)
    }

    # Kinder hinzufuegen (nur wenn Name vorhanden)
    for i in range(1, 10):
        kind_name = guest.get(f'kin{i}')
        if kind_name:
            result["kinder"].append({
                "nr": i,
                "name": kind_name,
                "nachname": guest.get(f'nac{i}'),
                "geburtsdatum": serialize_date(guest.get(f'geb{i}')),
                "geschlecht": guest.get(f'ges{i}'),
                "nationalitaet": guest.get(f'cvg{i}'),
                "dokument_nr": guest.get(f'cvd{i}')
            })

    # Mitreisende-Zusammenfassung
    mitreisende_count = (1 if result["partner"] else 0) + len(result["kinder"])
    result["mitreisende_anzahl"] = mitreisende_count

    return jsonify(result)


def serialize_date(value):
    """Datum serialisieren (None-safe)"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d') if value.year > 1900 else None
    return str(value) if value else None

# ============================================================================
# ROUTES - ARTIKEL & CHANNELS
# ============================================================================

@app.route('/articles')
def get_articles():
    """Alle Artikel/Leistungen"""
    query = "SELECT artn, beze, prei, knto FROM ART ORDER BY artn"
    articles = db_query(query)
    return jsonify({
        "count": len(articles),
        "articles": [serialize_row(a) for a in articles]
    })

@app.route('/channels')
def get_channels():
    """Alle Buchungskanaele"""
    query = "SELECT chid, name FROM CHC ORDER BY chid"
    channels = db_query(query)
    return jsonify({
        "count": len(channels),
        "channels": [serialize_row(c) for c in channels]
    })

# ============================================================================
# ROUTES - KALENDER
# ============================================================================

@app.route('/calendar')
def get_calendar():
    """
    Belegungskalender

    Query-Parameter:
    - month: Monat (1-12)
    - year: Jahr (YYYY)
    - days: Anzahl Tage (default 30)
    """
    month = request.args.get('month', datetime.now().month, type=int)
    year = request.args.get('year', datetime.now().year, type=int)
    days = request.args.get('days', 30, type=int)

    start_date = datetime(year, month, 1)
    end_date = start_date + timedelta(days=days)

    # Alle Zimmer
    query_rooms = "SELECT zimm, beze FROM ZIM ORDER BY zimm"
    rooms = db_query(query_rooms)

    # Buchungen im Zeitraum
    query_bookings = """
        SELECT BUZ.zimm, BUZ.vndt, BUZ.bsdt, BUZ.resn, BUZ.pers,
               BUC.stat, BUC.gast, GKT.nacn
        FROM (BUZ INNER JOIN BUC ON BUZ.resn = BUC.resn)
        LEFT JOIN GKT ON BUC.gast = GKT.gast
        WHERE BUZ.vndt <= ? AND BUZ.bsdt >= ?
    """
    bookings = db_query(query_bookings, (end_date.strftime('%Y-%m-%d'), start_date.strftime('%Y-%m-%d')))

    # Kalender aufbauen
    calendar = []
    for room in rooms:
        room_bookings = [
            {
                "resn": b['resn'],
                "from": b['vndt'].strftime('%Y-%m-%d') if b['vndt'] else None,
                "to": b['bsdt'].strftime('%Y-%m-%d') if b['bsdt'] else None,
                "guest": b['nacn'],
                "persons": b['pers'],
                "status": b['stat']
            }
            for b in bookings if b['zimm'] == room['zimm']
        ]
        calendar.append({
            "zimm": room['zimm'],
            "name": room['beze'],
            "bookings": room_bookings
        })

    return jsonify({
        "start": start_date.strftime('%Y-%m-%d'),
        "end": end_date.strftime('%Y-%m-%d'),
        "rooms": calendar
    })

# ============================================================================
# ROUTES - STATISTIKEN
# ============================================================================

@app.route('/stats')
def get_stats():
    """Allgemeine Statistiken"""
    stats = {}

    # Anzahlen
    stats['total_guests'] = db_query("SELECT COUNT(*) as c FROM GKT", fetchone=True)['c']
    stats['total_bookings'] = db_query("SELECT COUNT(*) as c FROM BUC", fetchone=True)['c']
    stats['total_rooms'] = db_query("SELECT COUNT(*) as c FROM ZIM", fetchone=True)['c']

    # Buchungen pro Channel
    channels = {}
    query_ch = "SELECT chid FROM BUC"
    all_bookings = db_query(query_ch)

    ch_names = {c['chid']: c['name'] for c in db_query("SELECT chid, name FROM CHC")}

    from collections import Counter
    ch_counts = Counter([b['chid'] for b in all_bookings])
    for chid, count in ch_counts.most_common():
        channels[ch_names.get(chid, f'Channel {chid}')] = count

    stats['bookings_by_channel'] = channels

    return jsonify(stats)

# ============================================================================
# ROUTES - BLOCKIERUNG (Kalender-Sichtbar)
# ============================================================================

@app.route('/block', methods=['POST'])
def create_block():
    """
    Zeitraum im Kalender blockieren (Im Kalender sichtbar)

    Erstellt einen BUC-Eintrag mit stat=0 (Angebot) und flgl=4 (sichtbar)
    Dies zeigt einen gelben Balken im CapCorn-Kalender.

    JSON Body:
    {
        "zimm": 5,              // Zimmer-Nummer
        "von": "2025-01-15",    // Startdatum
        "bis": "2025-01-18",    // Enddatum
        "grund": "Angebot 123", // Grund/Beschreibung (optional)
        "gast": 0               // Gast-ID (optional, 0 = kein Gast)
    }
    """
    data = request.json

    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    zimm = data.get('zimm')
    von = data.get('von')
    bis = data.get('bis')
    grund = data.get('grund', 'Blockierung')
    gast = data.get('gast', 0)

    if not all([zimm, von, bis]):
        return jsonify({"error": "zimm, von, bis sind erforderlich"}), 400

    # Verfuegbarkeit pruefen
    query_check = """
        SELECT COUNT(*) as c FROM BUZ
        WHERE zimm = ? AND vndt <= ? AND bsdt >= ?
    """
    check = db_query(query_check, (zimm, bis, von), fetchone=True)
    if check['c'] > 0:
        return jsonify({"error": "Zimmer ist im Zeitraum bereits belegt"}), 409

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Neue Reservierungsnummer
        cursor.execute("SELECT MAX(resn) FROM BUC")
        max_resn = cursor.fetchone()[0] or 0
        resn = max_resn + 1

        # BUC anlegen mit stat=0 (Angebot) und flgl=4 (Im Kalender sichtbar)
        cursor.execute("""
            INSERT INTO BUC (resn, gast, stat, flgl, andf, ande, chid, bdat, extn)
            VALUES (?, ?, 0, 4, ?, ?, 0, ?, ?)
        """, (resn, gast, von, bis, datetime.now(), grund))

        # BUZ anlegen (Zimmer-Belegung)
        cursor.execute("""
            INSERT INTO BUZ (resn, lfdn, zimm, vndt, bsdt, pers, kndr)
            VALUES (?, 1, ?, ?, ?, 0, 0)
        """, (resn, zimm, von, bis))

        conn.commit()

        return jsonify({
            "success": True,
            "resn": resn,
            "zimm": zimm,
            "von": von,
            "bis": bis,
            "flgl": 4,
            "message": f"Blockierung {resn} wurde angelegt (Im Kalender sichtbar)"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


@app.route('/block/<int:resn>', methods=['DELETE'])
def remove_block(resn):
    """
    Blockierung entfernen

    Loescht die BUZ-Eintraege und setzt BUC.stat auf storniert
    """
    # Pruefen ob Blockierung existiert und eine Blockierung ist (stat=0, flgl=4)
    booking = db_query("SELECT resn, stat, flgl FROM BUC WHERE resn = ?", (resn,), fetchone=True)

    if not booking:
        return jsonify({"error": "Blockierung nicht gefunden"}), 404

    if booking['stat'] != 0 or booking.get('flgl') != 4:
        return jsonify({"error": "Dies ist keine Blockierung (stat muss 0 und flgl muss 4 sein)"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        # BUZ loeschen
        cursor.execute("DELETE FROM BUZ WHERE resn = ?", (resn,))

        # BUC loeschen oder auf storniert setzen
        cursor.execute("DELETE FROM BUC WHERE resn = ?", (resn,))

        conn.commit()

        return jsonify({
            "success": True,
            "resn": resn,
            "message": f"Blockierung {resn} wurde entfernt"
        })

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# ============================================================================
# ROUTES - SCHREIBEN (Option, Buchen, Stornieren)
# ============================================================================

@app.route('/option', methods=['POST'])
def create_option():
    """
    Neue Option anlegen (Zimmer blockieren)

    JSON Body:
    {
        "gast": 123,           // Gast-ID (optional, wird erstellt wenn nicht vorhanden)
        "zimm": 5,             // Zimmer-Nummer
        "von": "2025-01-15",   // Anreise
        "bis": "2025-01-18",   // Abreise
        "pers": 2,             // Personen
        "kndr": 0,             // Kinder
        "channel": 0,          // Channel-ID (0 = lokal)

        // Oder neuer Gast:
        "vorname": "Max",
        "nachname": "Mustermann",
        "email": "max@example.com"
    }
    """
    data = request.json

    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    zimm = data.get('zimm')
    von = data.get('von')
    bis = data.get('bis')
    pers = data.get('pers', 2)
    kndr = data.get('kndr', 0)
    channel = data.get('channel', 0)
    gast = data.get('gast')

    if not all([zimm, von, bis]):
        return jsonify({"error": "zimm, von, bis sind erforderlich"}), 400

    # Verfuegbarkeit pruefen
    query_check = """
        SELECT COUNT(*) as c FROM BUZ
        WHERE zimm = ? AND vndt <= ? AND bsdt >= ?
    """
    check = db_query(query_check, (zimm, bis, von), fetchone=True)
    if check['c'] > 0:
        return jsonify({"error": "Zimmer ist im Zeitraum bereits belegt"}), 409

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Gast anlegen wenn noetig
        if not gast and data.get('nachname'):
            cursor.execute("SELECT MAX(gast) FROM GKT")
            max_gast = cursor.fetchone()[0] or 0
            gast = max_gast + 1

            cursor.execute("""
                INSERT INTO GKT (gast, vorn, nacn, mail)
                VALUES (?, ?, ?, ?)
            """, (gast, data.get('vorname', ''), data.get('nachname', ''), data.get('email', '')))

        # Neue Reservierungsnummer
        cursor.execute("SELECT MAX(resn) FROM BUC")
        max_resn = cursor.fetchone()[0] or 0
        resn = max_resn + 1

        # BUC anlegen (stat=2 fuer Option/Anfrage)
        cursor.execute("""
            INSERT INTO BUC (resn, gast, stat, andf, ande, chid, bdat)
            VALUES (?, ?, 2, ?, ?, ?, ?)
        """, (resn, gast, von, bis, channel, datetime.now()))

        # BUZ anlegen
        cursor.execute("""
            INSERT INTO BUZ (resn, lfdn, zimm, vndt, bsdt, pers, kndr)
            VALUES (?, 1, ?, ?, ?, ?, ?)
        """, (resn, zimm, von, bis, pers, kndr))

        conn.commit()

        return jsonify({
            "success": True,
            "resn": resn,
            "gast": gast,
            "message": f"Option {resn} wurde angelegt"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@app.route('/book/<int:resn>', methods=['PUT'])
def book_option(resn):
    """Option zur Buchung wandeln"""
    # Pruefen ob Buchung existiert
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)

    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Status auf "gebucht" setzen (stat=2 = bestaetigte Buchung)
    # flgl=0 damit es nicht mehr als Blockierung sichtbar ist
    db_execute("UPDATE BUC SET stat = 2, flgl = 0 WHERE resn = ?", (resn,))

    return jsonify({
        "success": True,
        "resn": resn,
        "message": f"Buchung {resn} wurde bestaetigt"
    })


@app.route('/booking-with-price', methods=['POST'])
def create_booking_with_price():
    """
    Buchung mit Preisen aus Webapp erstellen

    Die Preise kommen komplett aus der Webapp (Preis-Engine).
    CapCorn-Preise werden ignoriert!

    JSON Body:
    {
        "gast": 123,                    // Gast-ID (oder neu anlegen)
        "zimm": 5,                      // Zimmer-Nummer
        "von": "2025-01-15",            // Anreise
        "bis": "2025-01-22",            // Abreise
        "pers": 2,                      // Personen
        "kndr": 0,                      // Kinder
        "channel": 0,                   // Channel-ID (0 = lokal/webapp)
        "pession": 2,                   // Verpflegung (0=UE, 1=F, 2=HP)

        // Preise aus Webapp:
        "positionen": [
            {"artikel": "Zimmer DZ Seeblick", "preis": 840.00, "artn": null},
            {"artikel": "Halbpension 2 Pers.", "preis": 490.00, "artn": 53},
            {"artikel": "E-Bike 3 Tage", "preis": 75.00, "artn": 19},
            {"artikel": "Stammgast-Rabatt 10%", "preis": -140.50, "artn": null}
        ],

        // Oder als Pauschale:
        "pauschale": {
            "name": "Romantik-Wochenende",
            "preis": 890.00
        },

        // Gast-Daten (wenn neu):
        "vorname": "Max",
        "nachname": "Mustermann",
        "email": "max@example.com",
        "telefon": "+43123456"
    }
    """
    data = request.json

    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    zimm = data.get('zimm')
    von = data.get('von')
    bis = data.get('bis')
    pers = data.get('pers', 2)
    kndr = data.get('kndr', 0)
    channel = data.get('channel', 0)
    pession = data.get('pession', 1)  # Default: Fruehstueck
    gast = data.get('gast')

    if not all([zimm, von, bis]):
        return jsonify({"error": "zimm, von, bis sind erforderlich"}), 400

    # Verfuegbarkeit pruefen
    query_check = """
        SELECT COUNT(*) as c FROM BUZ
        WHERE zimm = ? AND vndt <= ? AND bsdt >= ?
        AND resn IN (SELECT resn FROM BUC WHERE stat = 2)
    """
    check = db_query(query_check, (zimm, bis, von), fetchone=True)
    if check['c'] > 0:
        return jsonify({"error": "Zimmer ist im Zeitraum bereits belegt"}), 409

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Gast anlegen wenn noetig
        if not gast and data.get('nachname'):
            cursor.execute("SELECT MAX(gast) FROM GKT")
            max_gast = cursor.fetchone()[0] or 0
            gast = max_gast + 1

            cursor.execute("""
                INSERT INTO GKT (gast, vorn, nacn, mail, teln)
                VALUES (?, ?, ?, ?, ?)
            """, (
                gast,
                data.get('vorname', ''),
                data.get('nachname', ''),
                data.get('email', ''),
                data.get('telefon', '')
            ))

        if not gast:
            gast = 0

        # Neue Reservierungsnummer
        cursor.execute("SELECT MAX(resn) FROM BUC")
        max_resn = cursor.fetchone()[0] or 0
        resn = max_resn + 1

        # BUC anlegen (stat=2 = bestaetigte Buchung)
        cursor.execute("""
            INSERT INTO BUC (resn, gast, stat, flgl, andf, ande, chid, bdat)
            VALUES (?, ?, 2, 0, ?, ?, ?, ?)
        """, (resn, gast, von, bis, channel, datetime.now()))

        # BUZ anlegen mit Verpflegung
        cursor.execute("""
            INSERT INTO BUZ (resn, lfdn, zimm, vndt, bsdt, pers, kndr, pession)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?)
        """, (resn, zimm, von, bis, pers, kndr, pession))

        # Positionen auf Konto buchen (Preise aus Webapp!)
        positionen = data.get('positionen', [])
        pauschale = data.get('pauschale')

        if pauschale:
            # Eine Position fuer die gesamte Pauschale
            positionen = [{
                "artikel": pauschale.get('name', 'Pauschale'),
                "preis": pauschale.get('preis', 0),
                "artn": None
            }]

        total = 0
        for pos in positionen:
            cursor.execute("SELECT MAX(aknr) FROM AKZ")
            max_aknr = cursor.fetchone()[0] or 0
            aknr = max_aknr + 1

            preis = pos.get('preis', 0)
            total += preis

            cursor.execute("""
                INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1, meng)
                VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1)
            """, (
                aknr,
                datetime.now(),
                resn,
                zimm,
                pos.get('artn', 0) or 0,
                preis,
                pos.get('artikel', '')
            ))

        conn.commit()

        return jsonify({
            "success": True,
            "resn": resn,
            "gast": gast,
            "zimm": zimm,
            "von": von,
            "bis": bis,
            "positionen": len(positionen),
            "total": total,
            "message": f"Buchung {resn} wurde mit Webapp-Preisen erstellt"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@app.route('/cancel/<int:resn>', methods=['DELETE'])
def cancel_booking(resn):
    """Buchung stornieren"""
    # Pruefen ob Buchung existiert
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)

    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    conn = get_db()
    cursor = conn.cursor()

    try:
        # BUZ loeschen
        cursor.execute("DELETE FROM BUZ WHERE resn = ?", (resn,))

        # BUC Status auf storniert setzen (oder loeschen)
        # Wir setzen stat auf 65536 (storniert)
        cursor.execute("UPDATE BUC SET stat = 65536 WHERE resn = ?", (resn,))

        conn.commit()

        return jsonify({
            "success": True,
            "resn": resn,
            "message": f"Buchung {resn} wurde storniert"
        })

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# ROUTES - GAST ANLEGEN/AKTUALISIEREN
# ============================================================================

@app.route('/guest', methods=['POST'])
def create_guest():
    """
    Neuen Gast anlegen

    JSON Body:
    {
        "vorname": "Max",
        "nachname": "Mustermann",
        "email": "max@example.com",
        "telefon": "+43123456",
        "strasse": "Hauptstr. 1",
        "plz": "1234",
        "ort": "Wien",
        "land": "AT"
    }
    """
    data = request.json

    if not data or not data.get('nachname'):
        return jsonify({"error": "nachname ist erforderlich"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Neue Gast-ID
        cursor.execute("SELECT MAX(gast) FROM GKT")
        max_gast = cursor.fetchone()[0] or 0
        gast = max_gast + 1

        cursor.execute("""
            INSERT INTO GKT (gast, vorn, nacn, mail, teln, stra, polz, ortb, land)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            gast,
            data.get('vorname', ''),
            data.get('nachname', ''),
            data.get('email', ''),
            data.get('telefon', ''),
            data.get('strasse', ''),
            data.get('plz', ''),
            data.get('ort', ''),
            data.get('land', '')
        ))

        conn.commit()

        return jsonify({
            "success": True,
            "gast": gast,
            "message": f"Gast {gast} wurde angelegt"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@app.route('/guest/<int:gast>', methods=['PUT'])
def update_guest(gast):
    """
    Gast aktualisieren - ALLE Felder

    JSON Body (alle Felder optional):
    {
        // Stammdaten
        "vorname": "Max",
        "nachname": "Mustermann",
        "geschlecht": "M",           // M oder W
        "anrede": "Herr",            // Herr, Frau, etc.
        "titel": "Dr.",              // Akademischer Titel
        "geburtsdatum": "1985-05-15",

        // Kontakt
        "email": "max@example.com",
        "telefon": "+43 123 456789",
        "mobil": "+43 660 1234567",
        "fax": "+43 123 456780",

        // Adresse
        "strasse": "Musterstrasse 1",
        "plz": "4864",
        "ort": "Attersee",
        "land": "AT",

        // Zusatzinfos
        "nationalitaet": "AT",
        "sprache": "DE",
        "beruf": "Ingenieur",
        "notizen": "Stammgast seit 2020",
        "rabatt": 10,                // Stammgast-Rabatt in %

        // Partner/Frau
        "partner_name": "Anna Mustermann",
        "partner_geburtsdatum": "1987-03-20",
        "partner_geschlecht": "W",
        "partner_nationalitaet": "AT",
        "partner_dokument": "P123456",

        // Kinder (1-9)
        "kind1_name": "Tim",
        "kind1_geburtsdatum": "2015-08-10",
        "kind1_geschlecht": "M",
        "kind1_nationalitaet": "AT",
        "kind1_dokument": "P789012",
        // ... bis kind9_*

        // Dokumente (Meldewesen)
        "dokument_nr": "P123456789",
        "dokument_datum": "2020-01-15",

        // Firma
        "uid_nummer": "ATU12345678",
        "typ": "P",                  // P=Privat, F=Firma
        "gruppe": "VIP"
    }
    """
    data = request.json

    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    # Pruefen ob Gast existiert
    existing = db_query("SELECT gast FROM GKT WHERE gast = ?", (gast,), fetchone=True)
    if not existing:
        return jsonify({"error": "Gast nicht gefunden"}), 404

    # Komplettes Feld-Mapping: JSON-Name -> DB-Feldname
    field_map = {
        # Stammdaten
        'vorname': 'vorn',
        'nachname': 'nacn',
        'geschlecht': 'gesc',
        'anrede': 'anre',
        'titel': 'akad',
        'geburtsdatum': 'gebg',

        # Kontakt
        'email': 'mail',
        'email2': 'mad1',
        'telefon': 'teln',
        'mobil': 'mobt',
        'fax': 'faxn',
        'skype': 'skyp',

        # Adresse
        'strasse': 'stra',
        'plz': 'polz',
        'ort': 'ortb',
        'land': 'land',

        # Zusatzinfos
        'nationalitaet': 'nati',
        'sprache': 'lang',
        'beruf': 'beru',
        'notizen': 'noti',
        'rabatt': 'raba',

        # Partner/Frau
        'partner_name': 'frau',
        'partner_geburtsdatum': 'gebf',
        'partner_geschlecht': 'gesf',
        'partner_nationalitaet': 'cvgf',
        'partner_dokument': 'cvdf',

        # Kind 1
        'kind1_name': 'kin1',
        'kind1_geburtsdatum': 'geb1',
        'kind1_geschlecht': 'ges1',
        'kind1_nationalitaet': 'cvg1',
        'kind1_dokument': 'cvd1',

        # Kind 2
        'kind2_name': 'kin2',
        'kind2_geburtsdatum': 'geb2',
        'kind2_geschlecht': 'ges2',
        'kind2_nationalitaet': 'cvg2',
        'kind2_dokument': 'cvd2',

        # Kind 3
        'kind3_name': 'kin3',
        'kind3_geburtsdatum': 'geb3',
        'kind3_geschlecht': 'ges3',
        'kind3_nationalitaet': 'cvg3',
        'kind3_dokument': 'cvd3',

        # Kind 4
        'kind4_name': 'kin4',
        'kind4_geburtsdatum': 'geb4',
        'kind4_geschlecht': 'ges4',
        'kind4_nationalitaet': 'cvg4',
        'kind4_dokument': 'cvd4',

        # Kind 5
        'kind5_name': 'kin5',
        'kind5_geburtsdatum': 'geb5',
        'kind5_geschlecht': 'ges5',
        'kind5_nationalitaet': 'cvg5',
        'kind5_dokument': 'cvd5',

        # Kind 6
        'kind6_name': 'kin6',
        'kind6_geburtsdatum': 'geb6',
        'kind6_geschlecht': 'ges6',
        'kind6_nationalitaet': 'cvg6',
        'kind6_dokument': 'cvd6',

        # Kind 7
        'kind7_name': 'kin7',
        'kind7_geburtsdatum': 'geb7',
        'kind7_geschlecht': 'ges7',
        'kind7_nationalitaet': 'cvg7',
        'kind7_dokument': 'cvd7',

        # Kind 8
        'kind8_name': 'kin8',
        'kind8_geburtsdatum': 'geb8',
        'kind8_geschlecht': 'ges8',
        'kind8_nationalitaet': 'cvg8',
        'kind8_dokument': 'cvd8',

        # Kind 9
        'kind9_name': 'kin9',
        'kind9_geburtsdatum': 'geb9',
        'kind9_geschlecht': 'ges9',
        'kind9_nationalitaet': 'cvg9',
        'kind9_dokument': 'cvd9',

        # Dokumente (Gast selbst)
        'dokument_nr': 'cvdg',
        'gast_nationalitaet_cv': 'cvgg',
        'dokument_datum': 'cvbd',

        # Firma/Sonstiges
        'uid_nummer': 'uidn',
        'typ': 'type',
        'gruppe': 'grup',
        'b2b_code': 'b2bc',
        'flag': 'flag',

        # Freie Attribute
        'attribut1': 'att1',
        'attribut2': 'att2',
        'attribut3': 'att3',
        'attribut4': 'att4',
        'attribut5': 'att5',
        'attribut6': 'att6',
        'attribut7': 'att7',
        'attribut8': 'att8',
        'attribut9': 'att9',
        'attribut10': 'atta',

        # Zusaetzliche Namen (fuer komplexe Namensfelder)
        'nachname_frau': 'nacf',
        'nachname1': 'nac1',
        'nachname2': 'nac2',
        'nachname3': 'nac3',
        'nachname4': 'nac4',
        'nachname5': 'nac5',
        'nachname6': 'nac6',
        'nachname7': 'nac7',
        'nachname8': 'nac8',
        'nachname9': 'nac9',

        # Sonstiges
        'vertreter': 'vert',
        'reisedokument': 'rdoc',
        'anzahlung_zusatz': 'azus',
        'datum1': 'dat1',
        'datum2': 'dat2'
    }

    # Felder aktualisieren
    updates = []
    params = []

    for json_field, db_field in field_map.items():
        if json_field in data:
            updates.append(f"{db_field} = ?")
            params.append(data[json_field])

    if not updates:
        return jsonify({"error": "Keine Felder zum Aktualisieren"}), 400

    params.append(gast)
    query = f"UPDATE GKT SET {', '.join(updates)} WHERE gast = ?"

    db_execute(query, params)

    return jsonify({
        "success": True,
        "gast": gast,
        "updated_fields": len(updates),
        "message": f"Gast {gast} wurde aktualisiert ({len(updates)} Felder)"
    })

# ============================================================================
# ROUTES - LEISTUNG BUCHEN
# ============================================================================

@app.route('/service', methods=['POST'])
def add_service():
    """
    Leistung auf Konto buchen

    JSON Body:
    {
        "resn": 12345,      // Reservierungsnummer
        "zimm": 5,          // Zimmer (optional)
        "artn": 19,         // Artikel-Nummer (z.B. 19 = E-Bike)
        "prei": 25.00,      // Preis (optional, sonst aus ART)
        "bez1": "E-Bike 1 Tag"  // Beschreibung (optional)
    }
    """
    data = request.json

    resn = data.get('resn')
    artn = data.get('artn')

    if not resn or not artn:
        return jsonify({"error": "resn und artn sind erforderlich"}), 400

    # Buchung pruefen
    booking = db_query("SELECT resn, gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Artikel-Preis holen wenn nicht angegeben
    article = db_query("SELECT beze, prei FROM ART WHERE artn = ?", (artn,), fetchone=True)
    prei = data.get('prei', article['prei'] if article else 0)
    bez1 = data.get('bez1', article['beze'] if article else '')

    conn = get_db()
    cursor = conn.cursor()

    try:
        # AKZ-Nummer ermitteln
        cursor.execute("SELECT MAX(aknr) FROM AKZ")
        max_aknr = cursor.fetchone()[0] or 0
        aknr = max_aknr + 1

        # Kontobuchung einfuegen
        cursor.execute("""
            INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?)
        """, (aknr, datetime.now(), resn, data.get('zimm', 0), artn, prei, bez1))

        conn.commit()

        return jsonify({
            "success": True,
            "aknr": aknr,
            "resn": resn,
            "artn": artn,
            "prei": prei,
            "message": f"Leistung wurde auf Konto gebucht"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# ROUTES - KONTO
# ============================================================================

@app.route('/account/<int:resn>')
def get_account(resn):
    """Kontobuchungen einer Reservierung"""
    query = """
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ
        LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.resn = ?
        ORDER BY AKZ.edat
    """
    positions = db_query(query, (resn,))

    total = sum(p.get('prei', 0) or 0 for p in positions)

    return jsonify({
        "resn": resn,
        "count": len(positions),
        "total": total,
        "positions": [serialize_row(p) for p in positions]
    })

# ============================================================================
# ROUTES - CHECK-IN / CHECK-OUT
# ============================================================================

@app.route('/checkin/<int:resn>', methods=['PUT'])
def checkin(resn):
    """
    Zimmer einchecken

    Setzt BUZ.ckin = 2 fuer alle Zimmer der Buchung

    Query-Parameter:
    - zimm: (optional) Nur ein bestimmtes Zimmer einchecken
    """
    # Pruefen ob Buchung existiert
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    zimm = request.args.get('zimm', type=int)

    conn = get_db()
    cursor = conn.cursor()

    try:
        if zimm:
            # Nur ein Zimmer einchecken
            cursor.execute("UPDATE BUZ SET ckin = 2 WHERE resn = ? AND zimm = ?", (resn, zimm))
        else:
            # Alle Zimmer der Buchung einchecken
            cursor.execute("UPDATE BUZ SET ckin = 2 WHERE resn = ?", (resn,))

        affected = cursor.rowcount
        conn.commit()

        if affected == 0:
            return jsonify({"error": "Keine Zimmer zum Einchecken gefunden"}), 404

        return jsonify({
            "success": True,
            "resn": resn,
            "zimm": zimm,
            "rooms_checked_in": affected,
            "message": f"Check-in fuer Buchung {resn} erfolgreich"
        })

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


@app.route('/checkout/<int:resn>', methods=['PUT'])
def checkout(resn):
    """
    Zimmer auschecken

    Setzt BUZ.ckin = 4 fuer alle Zimmer der Buchung

    Query-Parameter:
    - zimm: (optional) Nur ein bestimmtes Zimmer auschecken
    """
    # Pruefen ob Buchung existiert
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    zimm = request.args.get('zimm', type=int)

    conn = get_db()
    cursor = conn.cursor()

    try:
        if zimm:
            # Nur ein Zimmer auschecken
            cursor.execute("UPDATE BUZ SET ckin = 4 WHERE resn = ? AND zimm = ?", (resn, zimm))
        else:
            # Alle Zimmer der Buchung auschecken
            cursor.execute("UPDATE BUZ SET ckin = 4 WHERE resn = ?", (resn,))

        affected = cursor.rowcount
        conn.commit()

        if affected == 0:
            return jsonify({"error": "Keine Zimmer zum Auschecken gefunden"}), 404

        return jsonify({
            "success": True,
            "resn": resn,
            "zimm": zimm,
            "rooms_checked_out": affected,
            "message": f"Check-out fuer Buchung {resn} erfolgreich"
        })

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


@app.route('/checkin-status/<int:resn>')
def get_checkin_status(resn):
    """
    Check-in Status einer Buchung abrufen

    ckin-Werte:
    - 0: Nicht eingecheckt
    - 2: Eingecheckt
    - 4: Ausgecheckt
    """
    query = """
        SELECT BUZ.zimm, BUZ.ckin, BUZ.vndt, BUZ.bsdt, ZIM.beze
        FROM BUZ
        LEFT JOIN ZIM ON BUZ.zimm = ZIM.zimm
        WHERE BUZ.resn = ?
    """
    rooms = db_query(query, (resn,))

    if not rooms:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    status_map = {0: "nicht eingecheckt", 2: "eingecheckt", 4: "ausgecheckt"}

    result = []
    for r in rooms:
        result.append({
            "zimm": r['zimm'],
            "name": r['beze'],
            "ckin": r['ckin'],
            "status": status_map.get(r['ckin'], f"unbekannt ({r['ckin']})"),
            "von": r['vndt'].strftime('%Y-%m-%d') if r['vndt'] else None,
            "bis": r['bsdt'].strftime('%Y-%m-%d') if r['bsdt'] else None
        })

    return jsonify({
        "resn": resn,
        "rooms": result
    })


# ============================================================================
# ROUTES - GAESTEANMELDUNG (Meldewesen)
# ============================================================================

@app.route('/registrations/<int:resn>')
def get_registrations(resn):
    """Gaesteanmeldungen einer Buchung abrufen"""
    query = """
        SELECT ANM.*, GKI.vorn, GKI.nacn, GKI.gebd, GKI.land
        FROM ANM
        LEFT JOIN GKI ON ANM.gast = GKI.gkid
        WHERE ANM.resn = ?
    """
    registrations = db_query(query, (resn,))

    status_map = {4: "abgemeldet", 6: "angemeldet"}

    result = []
    for r in registrations:
        result.append(serialize_row(r))
        result[-1]['status_text'] = status_map.get(r.get('stat'), f"unbekannt")

    return jsonify({
        "resn": resn,
        "count": len(result),
        "registrations": result
    })


@app.route('/register/<int:resn>', methods=['POST'])
def register_guest(resn):
    """
    Gast bei Polizei anmelden (Meldewesen)

    JSON Body:
    {
        "gast": 12345,          // GKI-ID des Gastes
        "zimm": 5,              // Zimmer-Nummer
        "pers": 1,              // Personen (default 1)
        "kind": 0               // Kinder (default 0)
    }

    Oder mit neuen Gastdaten:
    {
        "zimm": 5,
        "vorname": "Max",
        "nachname": "Mustermann",
        "geburtsdatum": "1980-05-15",
        "land": "AT",
        "dokument_typ": "P",    // P=Pass, I=ID
        "dokument_nr": "A12345678"
    }
    """
    # Pruefen ob Buchung existiert
    booking = db_query("SELECT resn, gast, andf, ande FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    data = request.json or {}
    zimm = data.get('zimm', 0)

    conn = get_db()
    cursor = conn.cursor()

    try:
        gast_id = data.get('gast')

        # Neuen Gast anlegen wenn noetig
        if not gast_id and data.get('nachname'):
            cursor.execute("SELECT MAX(gkid) FROM GKI")
            max_gkid = cursor.fetchone()[0] or 0
            gast_id = max_gkid + 1

            gebd = None
            if data.get('geburtsdatum'):
                gebd = datetime.strptime(data['geburtsdatum'], '%Y-%m-%d')

            cursor.execute("""
                INSERT INTO GKI (gkid, vorn, nacn, gebd, land)
                VALUES (?, ?, ?, ?, ?)
            """, (
                gast_id,
                data.get('vorname', ''),
                data.get('nachname', ''),
                gebd,
                data.get('land', '')
            ))

        if not gast_id:
            gast_id = booking['gast']

        # Neue Anmeldungsnummer
        cursor.execute("SELECT MAX(annr) FROM ANM")
        max_annr = cursor.fetchone()[0] or 0
        annr = max_annr + 1

        # ANM anlegen mit stat=6 (angemeldet)
        anreise = booking['andf']
        abreise = booking['ande']

        cursor.execute("""
            INSERT INTO ANM (annr, resn, gast, stat, dat1, dat2, pers, kind, numr)
            VALUES (?, ?, ?, 6, ?, ?, ?, ?, ?)
        """, (
            annr,
            resn,
            gast_id,
            anreise,
            abreise,
            data.get('pers', 1),
            data.get('kind', 0),
            zimm
        ))

        conn.commit()

        return jsonify({
            "success": True,
            "annr": annr,
            "resn": resn,
            "gast": gast_id,
            "message": f"Gast wurde angemeldet (ANM {annr})"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


@app.route('/deregister/<int:annr>', methods=['PUT'])
def deregister_guest(annr):
    """
    Gast bei Polizei abmelden

    Setzt ANM.stat = 4 (abgemeldet)
    """
    # Pruefen ob Anmeldung existiert
    registration = db_query("SELECT annr, stat FROM ANM WHERE annr = ?", (annr,), fetchone=True)
    if not registration:
        return jsonify({"error": "Anmeldung nicht gefunden"}), 404

    db_execute("UPDATE ANM SET stat = 4 WHERE annr = ?", (annr,))

    return jsonify({
        "success": True,
        "annr": annr,
        "message": f"Gast wurde abgemeldet (ANM {annr})"
    })


# ============================================================================
# ROUTES - RECHNUNGEN
# ============================================================================

@app.route('/invoices')
def get_invoices():
    """
    Rechnungen auflisten

    Query-Parameter:
    - from: Ab Datum (YYYY-MM-DD)
    - to: Bis Datum (YYYY-MM-DD)
    - guest: Gast-ID
    - limit: Max. Anzahl (default 100)
    """
    limit = request.args.get('limit', 100, type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    guest = request.args.get('guest', type=int)

    query = f"""
        SELECT TOP {limit} REC.rnum, REC.edat, REC.rbez, REC.gast,
               REC.pmv1, REC.pmv2, REC.pmv3, REC.pmta,
               GKT.vorn, GKT.nacn
        FROM REC
        LEFT JOIN GKT ON REC.gast = GKT.gast
        WHERE 1=1
    """
    params = []

    if date_from:
        query += " AND REC.edat >= ?"
        params.append(date_from)
    if date_to:
        query += " AND REC.edat <= ?"
        params.append(date_to)
    if guest:
        query += " AND REC.gast = ?"
        params.append(guest)

    query += " ORDER BY REC.rnum DESC"

    invoices = db_query(query, params if params else None)

    result = []
    for inv in invoices:
        total = abs(inv.get('pmv1', 0) or 0) + abs(inv.get('pmv2', 0) or 0) + abs(inv.get('pmv3', 0) or 0)
        r = serialize_row(inv)
        r['total'] = total
        result.append(r)

    return jsonify({
        "count": len(result),
        "invoices": result
    })


@app.route('/invoices/<int:rnum>')
def get_invoice(rnum):
    """Eine Rechnung mit Positionen abrufen"""
    # Rechnungs-Kopf
    query_rec = """
        SELECT REC.*, GKT.vorn, GKT.nacn, GKT.stra, GKT.polz, GKT.ortb, GKT.land
        FROM REC
        LEFT JOIN GKT ON REC.gast = GKT.gast
        WHERE REC.rnum = ?
    """
    invoice = db_query(query_rec, (rnum,), fetchone=True)

    if not invoice:
        return jsonify({"error": "Rechnung nicht gefunden"}), 404

    # Rechnungspositionen aus AKZ (ueber aknr Verknuepfung)
    query_positions = """
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ
        LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.aknr = ?
        ORDER BY AKZ.lfdn
    """
    positions = db_query(query_positions, (invoice.get('aknr'),))

    result = serialize_row(invoice)
    result['positions'] = [serialize_row(p) for p in positions]
    result['position_count'] = len(positions)

    # Gesamtbetrag berechnen
    total = abs(invoice.get('pmv1', 0) or 0) + abs(invoice.get('pmv2', 0) or 0) + abs(invoice.get('pmv3', 0) or 0)
    result['total'] = total

    return jsonify(result)


@app.route('/invoices/by-booking/<int:resn>')
def get_invoices_by_booking(resn):
    """Alle Rechnungen zu einer Buchung"""
    # Buchung holen um Gast-ID zu ermitteln
    booking = db_query("SELECT gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Rechnungen des Gastes suchen (im Zeitraum der Buchung wuerde komplexer)
    query = """
        SELECT REC.rnum, REC.edat, REC.rbez, REC.pmv1, REC.pmv2, REC.pmv3
        FROM REC
        WHERE REC.gast = ?
        ORDER BY REC.rnum DESC
    """
    invoices = db_query(query, (booking['gast'],))

    result = []
    for inv in invoices:
        total = abs(inv.get('pmv1', 0) or 0) + abs(inv.get('pmv2', 0) or 0) + abs(inv.get('pmv3', 0) or 0)
        r = serialize_row(inv)
        r['total'] = total
        result.append(r)

    return jsonify({
        "resn": resn,
        "gast": booking['gast'],
        "count": len(result),
        "invoices": result
    })


@app.route('/invoices/open')
def get_open_invoices():
    """
    Offene Rechnungen (unbezahlt)

    Rechnungen mit Zahlart 1 = "offene Forderung"
    """
    query = """
        SELECT REC.rnum, REC.edat, REC.gast, REC.pmv1, REC.pmv2, REC.pmv3,
               REC.pmt1, REC.rbez, GKT.vorn, GKT.nacn
        FROM REC
        LEFT JOIN GKT ON REC.gast = GKT.gast
        WHERE REC.pmt1 = 1
        ORDER BY REC.rnum DESC
    """
    invoices = db_query(query)

    result = []
    total_open = 0
    for inv in invoices:
        amount = (inv.get('pmv1', 0) or 0)
        total_open += amount
        r = serialize_row(inv)
        r['amount'] = amount
        r['guest_name'] = f"{inv.get('vorn', '')} {inv.get('nacn', '')}".strip()
        result.append(r)

    return jsonify({
        "count": len(result),
        "total_open": total_open,
        "invoices": result
    })


@app.route('/invoices/stats')
def get_invoice_stats():
    """
    Umsatz-Statistiken

    Query-Parameter:
    - year: Jahr (optional, z.B. 2024)
    - from: Ab Datum (YYYY-MM-DD)
    - to: Bis Datum (YYYY-MM-DD)
    """
    year = request.args.get('year', type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')

    # Basis-Query
    where_clause = "WHERE 1=1"
    params = []

    if year:
        where_clause += " AND YEAR(REC.edat) = ?"
        params.append(year)
    if date_from:
        where_clause += " AND REC.edat >= ?"
        params.append(date_from)
    if date_to:
        where_clause += " AND REC.edat <= ?"
        params.append(date_to)

    # Gesamtstatistik
    query_total = f"""
        SELECT COUNT(*) as count,
               SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as total
        FROM REC
        {where_clause}
    """
    total_stats = db_query(query_total, params if params else None, fetchone=True)

    # Nach Zahlart gruppiert
    query_by_payment = f"""
        SELECT pmt1, COUNT(*) as count, SUM(ABS(pmv1)) as amount
        FROM REC
        {where_clause}
        GROUP BY pmt1
    """
    by_payment = db_query(query_by_payment, params if params else None)

    # Zahlarten-Namen holen
    payment_types = {p['paym']: p['payt'] for p in db_query("SELECT paym, payt FROM PMT")}

    payment_breakdown = {}
    for p in by_payment:
        pmt_id = p['pmt1'] or 0
        pmt_name = payment_types.get(pmt_id, f'Unbekannt ({pmt_id})')
        payment_breakdown[pmt_name] = {
            "payment_type_id": pmt_id,
            "count": p['count'],
            "amount": round(p['amount'] or 0, 2)
        }

    # Nach Jahr gruppiert (letzte 5 Jahre)
    query_by_year = """
        SELECT YEAR(edat) as year, COUNT(*) as count,
               SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as amount
        FROM REC
        WHERE edat IS NOT NULL
        GROUP BY YEAR(edat)
        ORDER BY YEAR(edat) DESC
    """
    by_year_raw = db_query(query_by_year)
    by_year = {}
    for y in by_year_raw[:5]:
        if y['year']:
            by_year[str(y['year'])] = {
                "count": y['count'],
                "amount": round(y['amount'] or 0, 2)
            }

    # Offene Rechnungen
    query_open = "SELECT COUNT(*) as count, SUM(pmv1) as amount FROM REC WHERE pmt1 = 1"
    open_invoices = db_query(query_open, fetchone=True)

    return jsonify({
        "total_invoices": total_stats['count'] or 0,
        "total_revenue": round(total_stats['total'] or 0, 2),
        "by_payment_type": payment_breakdown,
        "by_year": by_year,
        "open_invoices": {
            "count": open_invoices['count'] or 0,
            "amount": round(open_invoices['amount'] or 0, 2)
        },
        "filters": {
            "year": year,
            "from": date_from,
            "to": date_to
        }
    })


@app.route('/invoices/by-payment-type')
def get_invoices_by_payment_type():
    """
    Umsatz nach Zahlart gruppiert

    Query-Parameter:
    - year: Jahr (optional)
    - from: Ab Datum (YYYY-MM-DD)
    - to: Bis Datum (YYYY-MM-DD)
    """
    year = request.args.get('year', type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')

    where_clause = "WHERE 1=1"
    params = []

    if year:
        where_clause += " AND YEAR(REC.edat) = ?"
        params.append(year)
    if date_from:
        where_clause += " AND REC.edat >= ?"
        params.append(date_from)
    if date_to:
        where_clause += " AND REC.edat <= ?"
        params.append(date_to)

    query = f"""
        SELECT pmt1, COUNT(*) as invoice_count,
               SUM(ABS(pmv1)) as total_amount,
               MIN(edat) as first_invoice,
               MAX(edat) as last_invoice
        FROM REC
        {where_clause}
        GROUP BY pmt1
        ORDER BY SUM(ABS(pmv1)) DESC
    """
    results = db_query(query, params if params else None)

    # Zahlarten-Namen holen
    payment_types = {p['paym']: p['payt'] for p in db_query("SELECT paym, payt FROM PMT")}

    breakdown = []
    total_all = 0
    for r in results:
        pmt_id = r['pmt1'] or 0
        amount = r['total_amount'] or 0
        total_all += amount
        breakdown.append({
            "payment_type_id": pmt_id,
            "payment_type_name": payment_types.get(pmt_id, f'Unbekannt ({pmt_id})'),
            "invoice_count": r['invoice_count'],
            "total_amount": round(amount, 2),
            "first_invoice": r['first_invoice'].isoformat() if r['first_invoice'] else None,
            "last_invoice": r['last_invoice'].isoformat() if r['last_invoice'] else None
        })

    # Prozentanteile berechnen
    for b in breakdown:
        b['percentage'] = round((b['total_amount'] / total_all * 100) if total_all > 0 else 0, 1)

    return jsonify({
        "total_revenue": round(total_all, 2),
        "breakdown": breakdown,
        "filters": {
            "year": year,
            "from": date_from,
            "to": date_to
        }
    })


@app.route('/payment-types')
def get_payment_types():
    """Alle Zahlarten auflisten"""
    query = "SELECT paym, payt, gknt, flag FROM PMT ORDER BY paym"
    payment_types = db_query(query)
    return jsonify({
        "count": len(payment_types),
        "payment_types": [serialize_row(p) for p in payment_types]
    })


@app.route('/invoices/by-month')
def get_invoices_by_month():
    """
    Umsatz nach Monat gruppiert

    Query-Parameter:
    - year: Jahr (default: aktuelles Jahr)
    """
    year = request.args.get('year', datetime.now().year, type=int)

    query = """
        SELECT MONTH(edat) as month, COUNT(*) as invoice_count,
               SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as total_amount
        FROM REC
        WHERE YEAR(edat) = ?
        GROUP BY MONTH(edat)
        ORDER BY MONTH(edat)
    """
    results = db_query(query, (year,))

    # Alle Monate mit 0 initialisieren
    months = {i: {"month": i, "invoice_count": 0, "total_amount": 0} for i in range(1, 13)}
    month_names = ["", "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
                   "Juli", "August", "September", "Oktober", "November", "Dezember"]

    total_year = 0
    for r in results:
        m = r['month']
        if m:
            months[m] = {
                "month": m,
                "month_name": month_names[m],
                "invoice_count": r['invoice_count'],
                "total_amount": round(r['total_amount'] or 0, 2)
            }
            total_year += r['total_amount'] or 0

    return jsonify({
        "year": year,
        "total_revenue": round(total_year, 2),
        "months": list(months.values())
    })


@app.route('/invoices/by-year')
def get_invoices_by_year():
    """Umsatz nach Jahr gruppiert (alle Jahre)"""
    query = """
        SELECT YEAR(edat) as year, COUNT(*) as invoice_count,
               SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as total_amount
        FROM REC
        WHERE edat IS NOT NULL
        GROUP BY YEAR(edat)
        ORDER BY YEAR(edat) DESC
    """
    results = db_query(query)

    years = []
    for r in results:
        if r['year']:
            years.append({
                "year": r['year'],
                "invoice_count": r['invoice_count'],
                "total_amount": round(r['total_amount'] or 0, 2)
            })

    return jsonify({
        "count": len(years),
        "years": years
    })


# ============================================================================
# ROUTES - VERPFLEGUNG (Meal/Pension)
# ============================================================================

@app.route('/meal/<int:resn>')
def get_meal(resn):
    """
    Verpflegung einer Buchung anzeigen

    Gibt zurueck:
    - Basis-Verpflegung pro Zimmer (aus BUZ.pession)
    - Bereits gebuchte HP-Aenderungen (aus AKZ)
    - Tagesweise Uebersicht
    """
    # Buchung pruefen
    query_buc = """
        SELECT BUC.resn, BUC.gast, BUC.andf, BUC.ande, BUC.stat,
               GKT.vorn, GKT.nacn
        FROM BUC
        LEFT JOIN GKT ON BUC.gast = GKT.gast
        WHERE BUC.resn = ?
    """
    booking = db_query(query_buc, (resn,), fetchone=True)

    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Zimmer mit Verpflegung holen
    query_buz = """
        SELECT BUZ.buzn, BUZ.zimm, BUZ.vndt, BUZ.bsdt, BUZ.pers, BUZ.kndr,
               BUZ.pession, ZIM.beze as zimmer_name
        FROM BUZ
        LEFT JOIN ZIM ON BUZ.zimm = ZIM.zimm
        WHERE BUZ.resn = ?
    """
    rooms = db_query(query_buz, (resn,))

    # HP-Buchungen auf dem Konto (Artikel mit "HP" oder "Halbpension" im Namen)
    query_hp = """
        SELECT AKZ.aknr, AKZ.edat, AKZ.artn, AKZ.prei, AKZ.bez1, AKZ.meng,
               ART.beze as artikel_name
        FROM AKZ
        LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.resn = ?
        AND (ART.beze LIKE '%HP%' OR ART.beze LIKE '%albpension%'
             OR AKZ.bez1 LIKE '%HP%' OR AKZ.bez1 LIKE '%albpension%')
    """
    hp_bookings = db_query(query_hp, (resn,))

    # Pension-Typen Mapping
    pension_types = {
        0: {"code": "UE", "name": "Nur Uebernachtung", "has_breakfast": False, "has_dinner": False},
        1: {"code": "FR", "name": "Fruehstueck", "has_breakfast": True, "has_dinner": False},
        2: {"code": "HP", "name": "Halbpension", "has_breakfast": True, "has_dinner": True},
        3: {"code": "VP", "name": "Vollpension", "has_breakfast": True, "has_dinner": True}
    }

    # Tage berechnen
    days = []
    if rooms:
        room = rooms[0]  # Hauptzimmer
        if room.get('vndt') and room.get('bsdt'):
            current = room['vndt']
            end = room['bsdt']
            while current < end:
                days.append({
                    "date": current.strftime('%Y-%m-%d'),
                    "weekday": current.strftime('%A'),
                    "weekday_short": ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][current.weekday()]
                })
                current += timedelta(days=1)

    result = {
        "resn": resn,
        "guest": f"{booking.get('vorn', '')} {booking.get('nacn', '')}".strip(),
        "anreise": booking['andf'].strftime('%Y-%m-%d') if booking.get('andf') else None,
        "abreise": booking['ande'].strftime('%Y-%m-%d') if booking.get('ande') else None,
        "days": days,
        "nights": len(days),
        "rooms": [],
        "hp_bookings": [serialize_row(h) for h in hp_bookings],
        "hp_total": sum(h.get('prei', 0) or 0 for h in hp_bookings),
        "pension_types": pension_types
    }

    for room in rooms:
        pession = room.get('pession') or 0
        pension_info = pension_types.get(pession, pension_types[0])
        result["rooms"].append({
            "buzn": room.get('buzn'),
            "zimm": room.get('zimm'),
            "zimmer_name": room.get('zimmer_name'),
            "von": room['vndt'].strftime('%Y-%m-%d') if room.get('vndt') else None,
            "bis": room['bsdt'].strftime('%Y-%m-%d') if room.get('bsdt') else None,
            "personen": room.get('pers', 2),
            "kinder": room.get('kndr', 0),
            "pession": pession,
            "pension_code": pension_info["code"],
            "pension_name": pension_info["name"],
            "has_breakfast": pension_info["has_breakfast"],
            "has_dinner": pension_info["has_dinner"]
        })

    return jsonify(result)


@app.route('/meal-day', methods=['POST'])
def book_meal_day():
    """
    HP fuer einen bestimmten Tag/Person buchen oder stornieren

    JSON Body:
    {
        "resn": 12345,          // Reservierungsnummer
        "date": "2025-01-15",   // Datum
        "person": 1,            // Person (1, 2, ...)
        "action": "add",        // "add" oder "remove"
        "price": 25.00,         // Preis pro Person/Nacht (optional)
        "article": 99           // Artikel-Nummer fuer HP (optional)
    }

    Bei "add": Bucht HP-Zuschlag auf Konto (positiver Betrag)
    Bei "remove": Bucht HP-Gutschrift auf Konto (negativer Betrag)
    """
    data = request.json

    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    resn = data.get('resn')
    date_str = data.get('date')
    person = data.get('person', 1)
    action = data.get('action', 'add')
    price = data.get('price', 25.00)  # Standard HP-Preis
    article = data.get('article')

    if not resn or not date_str:
        return jsonify({"error": "resn und date sind erforderlich"}), 400

    if action not in ['add', 'remove']:
        return jsonify({"error": "action muss 'add' oder 'remove' sein"}), 400

    # Buchung pruefen
    booking = db_query("SELECT resn, gast, andf, ande FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Datum parsen und pruefen
    try:
        meal_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Ungueltiges Datumsformat (YYYY-MM-DD erwartet)"}), 400

    # Pruefen ob Datum im Buchungszeitraum liegt
    anreise = booking['andf'].date() if isinstance(booking['andf'], datetime) else booking['andf']
    abreise = booking['ande'].date() if isinstance(booking['ande'], datetime) else booking['ande']

    if meal_date < anreise or meal_date >= abreise:
        return jsonify({"error": f"Datum {date_str} liegt nicht im Buchungszeitraum"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        # AKZ-Nummer ermitteln
        cursor.execute("SELECT MAX(aknr) FROM AKZ")
        max_aknr = cursor.fetchone()[0] or 0
        aknr = max_aknr + 1

        # Preis berechnen (negativ bei Stornierung)
        final_price = price if action == 'add' else -abs(price)

        # Beschreibung
        weekday = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][meal_date.weekday()]
        if action == 'add':
            beschreibung = f"HP {weekday} {meal_date.strftime('%d.%m.')} P{person}"
        else:
            beschreibung = f"HP Storno {weekday} {meal_date.strftime('%d.%m.')} P{person}"

        # Artikel-Nummer (Standard: 99 fuer HP, oder aus ART suchen)
        if not article:
            cursor.execute("SELECT artn FROM ART WHERE beze LIKE '%HP%' OR beze LIKE '%albpension%'")
            art_row = cursor.fetchone()
            article = art_row[0] if art_row else 99

        # Zimmer aus Buchung holen
        cursor.execute("SELECT zimm FROM BUZ WHERE resn = ?", (resn,))
        zimm_row = cursor.fetchone()
        zimm = zimm_row[0] if zimm_row else 0

        # Kontobuchung einfuegen
        cursor.execute("""
            INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1, meng)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1)
        """, (aknr, datetime.now(), resn, zimm, article, final_price, beschreibung))

        conn.commit()

        return jsonify({
            "success": True,
            "aknr": aknr,
            "resn": resn,
            "date": date_str,
            "person": person,
            "action": action,
            "price": final_price,
            "description": beschreibung,
            "message": f"HP {'gebucht' if action == 'add' else 'storniert'} fuer {date_str}"
        }), 201

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


@app.route('/meal-bulk', methods=['POST'])
def book_meal_bulk():
    """
    Mehrere HP-Buchungen auf einmal (fuer Gaeste-Portal)

    JSON Body:
    {
        "resn": 12345,
        "price_per_day": 25.00,
        "bookings": [
            {"date": "2025-01-15", "person": 1, "action": "add"},
            {"date": "2025-01-15", "person": 2, "action": "add"},
            {"date": "2025-01-16", "person": 1, "action": "remove"}
        ]
    }
    """
    data = request.json

    if not data or not data.get('resn') or not data.get('bookings'):
        return jsonify({"error": "resn und bookings sind erforderlich"}), 400

    resn = data['resn']
    price = data.get('price_per_day', 25.00)
    bookings = data['bookings']

    # Buchung pruefen
    booking = db_query("SELECT resn, gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    results = []
    errors = []

    for b in bookings:
        try:
            # Einzelbuchung ausfuehren
            from flask import Flask
            with app.test_request_context(json={
                "resn": resn,
                "date": b.get('date'),
                "person": b.get('person', 1),
                "action": b.get('action', 'add'),
                "price": price
            }):
                # Direkt die Funktion aufrufen statt HTTP
                result_data = {
                    "date": b.get('date'),
                    "person": b.get('person', 1),
                    "action": b.get('action', 'add'),
                    "success": True
                }
                results.append(result_data)
        except Exception as e:
            errors.append({
                "date": b.get('date'),
                "person": b.get('person'),
                "error": str(e)
            })

    # Jetzt alle Buchungen einzeln durchfuehren
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Artikel fuer HP finden
        cursor.execute("SELECT artn FROM ART WHERE beze LIKE '%HP%' OR beze LIKE '%albpension%'")
        art_row = cursor.fetchone()
        article = art_row[0] if art_row else 99

        # Zimmer holen
        cursor.execute("SELECT zimm FROM BUZ WHERE resn = ?", (resn,))
        zimm_row = cursor.fetchone()
        zimm = zimm_row[0] if zimm_row else 0

        # Buchungszeitraum holen
        cursor.execute("SELECT andf, ande FROM BUC WHERE resn = ?", (resn,))
        buc_row = cursor.fetchone()
        anreise = buc_row[0]
        abreise = buc_row[1]

        results = []
        total_added = 0
        total_removed = 0

        for b in bookings:
            try:
                meal_date = datetime.strptime(b['date'], '%Y-%m-%d').date()
                action = b.get('action', 'add')
                person = b.get('person', 1)

                # AKZ-Nummer
                cursor.execute("SELECT MAX(aknr) FROM AKZ")
                max_aknr = cursor.fetchone()[0] or 0
                aknr = max_aknr + 1

                final_price = price if action == 'add' else -abs(price)
                weekday = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][meal_date.weekday()]

                if action == 'add':
                    beschreibung = f"HP {weekday} {meal_date.strftime('%d.%m.')} P{person}"
                    total_added += price
                else:
                    beschreibung = f"HP Storno {weekday} {meal_date.strftime('%d.%m.')} P{person}"
                    total_removed += abs(price)

                cursor.execute("""
                    INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1, meng)
                    VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1)
                """, (aknr, datetime.now(), resn, zimm, article, final_price, beschreibung))

                results.append({
                    "date": b['date'],
                    "person": person,
                    "action": action,
                    "price": final_price,
                    "success": True
                })

            except Exception as e:
                results.append({
                    "date": b.get('date'),
                    "person": b.get('person'),
                    "action": b.get('action'),
                    "success": False,
                    "error": str(e)
                })

        conn.commit()

        return jsonify({
            "success": True,
            "resn": resn,
            "bookings_processed": len([r for r in results if r.get('success')]),
            "total_added": total_added,
            "total_removed": total_removed,
            "net_change": total_added - total_removed,
            "results": results
        })

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# ============================================================================
# BACKUP AGENT - Automatische Datenbank-Sicherung
# ============================================================================

import shutil
import glob as glob_module
import hashlib

# Backup configuration defaults
BACKUP_DEFAULTS = {
    "backup_enabled": True,
    "backup_interval": 6,  # Hours
    "backup_folder": None,  # Will use default if None
    "backup_keep_days": 7,
    "backup_keep_weeks": 4,
    "backup_keep_months": 12,
    "last_backup": None,
    "last_backup_size": None
}

def get_default_backup_folder():
    """Get default backup folder path"""
    return os.path.join(os.path.dirname(config['database_path']), 'backups')

def get_backup_folder():
    """Get configured or default backup folder"""
    folder = config.get('backup_folder')
    if not folder:
        folder = get_default_backup_folder()
    return folder

def ensure_backup_folder():
    """Create backup folder if it doesn't exist"""
    folder = get_backup_folder()
    if not os.path.exists(folder):
        os.makedirs(folder)
    return folder

def get_file_hash(filepath):
    """Calculate MD5 hash of a file"""
    hash_md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except:
        return None

def create_backup(force=False):
    """
    Create a backup of the Access database

    Returns dict with:
    - success: bool
    - message: str
    - backup_path: str (if success)
    - size_mb: float (if success)
    """
    try:
        db_path = config['database_path']

        if not os.path.exists(db_path):
            return {"success": False, "message": f"Datenbank nicht gefunden: {db_path}"}

        backup_folder = ensure_backup_folder()

        # Check if backup is needed (file changed since last backup)
        current_hash = get_file_hash(db_path)
        last_hash = config.get('last_backup_hash')

        if not force and current_hash and current_hash == last_hash:
            return {
                "success": True,
                "message": "Keine Aenderungen seit letztem Backup",
                "skipped": True,
                "last_backup": config.get('last_backup')
            }

        # Create timestamp for filename
        now = datetime.now()
        timestamp = now.strftime('%Y%m%d_%H%M%S')

        # Get original filename
        db_filename = os.path.basename(db_path)
        db_name = os.path.splitext(db_filename)[0]
        db_ext = os.path.splitext(db_filename)[1]

        # Create backup filename with timestamp
        backup_filename = f"{db_name}_backup_{timestamp}{db_ext}"
        backup_path = os.path.join(backup_folder, backup_filename)

        # Copy the database file
        shutil.copy2(db_path, backup_path)

        # Get file size
        size_bytes = os.path.getsize(backup_path)
        size_mb = round(size_bytes / (1024 * 1024), 2)

        # Update config with last backup info
        config['last_backup'] = now.isoformat()
        config['last_backup_path'] = backup_path
        config['last_backup_size'] = size_mb
        config['last_backup_hash'] = current_hash

        # Save config
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        # Cleanup old backups
        cleanup_old_backups()

        return {
            "success": True,
            "message": f"Backup erfolgreich erstellt",
            "backup_path": backup_path,
            "backup_filename": backup_filename,
            "size_mb": size_mb,
            "timestamp": now.isoformat()
        }

    except Exception as e:
        return {"success": False, "message": f"Backup-Fehler: {str(e)}"}

def cleanup_old_backups():
    """
    Cleanup old backups based on retention policy:
    - Keep all backups from last X days
    - Keep weekly backups for X weeks
    - Keep monthly backups for X months
    """
    try:
        backup_folder = get_backup_folder()
        if not os.path.exists(backup_folder):
            return

        keep_days = config.get('backup_keep_days', 7)
        keep_weeks = config.get('backup_keep_weeks', 4)
        keep_months = config.get('backup_keep_months', 12)

        now = datetime.now()

        # Get all backup files
        db_name = os.path.splitext(os.path.basename(config['database_path']))[0]
        pattern = os.path.join(backup_folder, f"{db_name}_backup_*.*")
        backup_files = glob_module.glob(pattern)

        # Parse backup dates and sort
        backups = []
        for filepath in backup_files:
            filename = os.path.basename(filepath)
            try:
                # Extract timestamp from filename: name_backup_YYYYMMDD_HHMMSS.ext
                parts = filename.replace(db_name + "_backup_", "").split(".")
                timestamp_str = parts[0]
                backup_date = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
                backups.append({
                    "path": filepath,
                    "date": backup_date,
                    "age_days": (now - backup_date).days
                })
            except:
                continue

        # Sort by date (newest first)
        backups.sort(key=lambda x: x['date'], reverse=True)

        # Determine which backups to keep
        keep_set = set()

        # Keep all from last X days
        for b in backups:
            if b['age_days'] <= keep_days:
                keep_set.add(b['path'])

        # Keep one per week for X weeks
        for week_num in range(keep_weeks):
            week_start = now - timedelta(days=7 * week_num + 7)
            week_end = now - timedelta(days=7 * week_num)

            for b in backups:
                if week_start <= b['date'] <= week_end:
                    keep_set.add(b['path'])
                    break

        # Keep one per month for X months
        for month_num in range(keep_months):
            month_date = now - timedelta(days=30 * month_num)
            target_month = month_date.month
            target_year = month_date.year

            for b in backups:
                if b['date'].month == target_month and b['date'].year == target_year:
                    keep_set.add(b['path'])
                    break

        # Delete old backups not in keep set
        deleted = 0
        for b in backups:
            if b['path'] not in keep_set:
                try:
                    os.remove(b['path'])
                    deleted += 1
                except:
                    pass

        return {"cleaned": deleted, "kept": len(keep_set)}

    except Exception as e:
        print(f"Cleanup error: {e}")
        return None

def list_backups():
    """List all available backups"""
    try:
        backup_folder = get_backup_folder()
        if not os.path.exists(backup_folder):
            return {"backups": [], "count": 0, "folder": backup_folder}

        db_name = os.path.splitext(os.path.basename(config['database_path']))[0]
        pattern = os.path.join(backup_folder, f"{db_name}_backup_*.*")
        backup_files = glob_module.glob(pattern)

        backups = []
        total_size = 0

        for filepath in backup_files:
            filename = os.path.basename(filepath)
            try:
                parts = filename.replace(db_name + "_backup_", "").split(".")
                timestamp_str = parts[0]
                backup_date = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
                size_bytes = os.path.getsize(filepath)
                size_mb = round(size_bytes / (1024 * 1024), 2)
                total_size += size_bytes

                backups.append({
                    "filename": filename,
                    "path": filepath,
                    "date": backup_date.isoformat(),
                    "date_formatted": backup_date.strftime('%d.%m.%Y %H:%M'),
                    "size_mb": size_mb,
                    "age_days": (datetime.now() - backup_date).days
                })
            except:
                continue

        # Sort by date (newest first)
        backups.sort(key=lambda x: x['date'], reverse=True)

        return {
            "backups": backups,
            "count": len(backups),
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "folder": backup_folder
        }

    except Exception as e:
        return {"error": str(e), "backups": [], "count": 0}

def get_backup_status():
    """Get current backup status"""
    last_backup = config.get('last_backup')
    last_backup_dt = None
    hours_since = None

    if last_backup:
        try:
            last_backup_dt = datetime.fromisoformat(last_backup)
            hours_since = round((datetime.now() - last_backup_dt).total_seconds() / 3600, 1)
        except:
            pass

    backup_folder = get_backup_folder()
    folder_exists = os.path.exists(backup_folder)

    # Count backups
    backup_count = 0
    if folder_exists:
        db_name = os.path.splitext(os.path.basename(config['database_path']))[0]
        pattern = os.path.join(backup_folder, f"{db_name}_backup_*.*")
        backup_count = len(glob_module.glob(pattern))

    return {
        "enabled": config.get('backup_enabled', True),
        "interval_hours": config.get('backup_interval', 6),
        "folder": backup_folder,
        "folder_exists": folder_exists,
        "last_backup": last_backup,
        "last_backup_formatted": last_backup_dt.strftime('%d.%m.%Y %H:%M') if last_backup_dt else None,
        "hours_since_backup": hours_since,
        "backup_needed": hours_since is None or hours_since >= config.get('backup_interval', 6),
        "last_backup_size_mb": config.get('last_backup_size'),
        "backup_count": backup_count,
        "retention": {
            "keep_days": config.get('backup_keep_days', 7),
            "keep_weeks": config.get('backup_keep_weeks', 4),
            "keep_months": config.get('backup_keep_months', 12)
        }
    }


# ============================================================================
# BACKUP ENDPOINTS
# ============================================================================

@app.route('/backup/status')
def backup_status():
    """Get backup agent status"""
    return jsonify(get_backup_status())


@app.route('/backup/now', methods=['POST'])
def backup_now():
    """Trigger immediate backup"""
    force = request.json.get('force', False) if request.json else False
    result = create_backup(force=force)

    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 500


@app.route('/backup/list')
def backup_list():
    """List all available backups"""
    return jsonify(list_backups())


@app.route('/backup/restore/<filename>', methods=['POST'])
def backup_restore(filename):
    """
    Restore database from a backup
    WARNING: This will overwrite the current database!
    """
    backup_folder = get_backup_folder()
    backup_path = os.path.join(backup_folder, filename)

    if not os.path.exists(backup_path):
        return jsonify({"error": "Backup nicht gefunden"}), 404

    # Safety check - require confirmation
    confirm = request.json.get('confirm', False) if request.json else False
    if not confirm:
        return jsonify({
            "error": "Bestaetigung erforderlich",
            "message": "Senden Sie {'confirm': true} um die Wiederherstellung zu bestaetigen",
            "warning": "ACHTUNG: Dies ueberschreibt die aktuelle Datenbank!"
        }), 400

    try:
        db_path = config['database_path']

        # Create a backup of current state first
        current_backup = create_backup(force=True)

        # Copy backup over current database
        shutil.copy2(backup_path, db_path)

        return jsonify({
            "success": True,
            "message": f"Datenbank wurde aus {filename} wiederhergestellt",
            "restored_from": backup_path,
            "safety_backup": current_backup.get('backup_path')
        })

    except Exception as e:
        return jsonify({"error": f"Wiederherstellungs-Fehler: {str(e)}"}), 500


@app.route('/backup/delete/<filename>', methods=['DELETE'])
def backup_delete(filename):
    """Delete a specific backup"""
    backup_folder = get_backup_folder()
    backup_path = os.path.join(backup_folder, filename)

    if not os.path.exists(backup_path):
        return jsonify({"error": "Backup nicht gefunden"}), 404

    try:
        os.remove(backup_path)
        return jsonify({
            "success": True,
            "message": f"Backup {filename} wurde geloescht"
        })
    except Exception as e:
        return jsonify({"error": f"Loeschfehler: {str(e)}"}), 500


@app.route('/backup/settings', methods=['GET', 'PUT'])
def backup_settings():
    """Get or update backup settings"""
    if request.method == 'GET':
        return jsonify({
            "backup_enabled": config.get('backup_enabled', True),
            "backup_interval": config.get('backup_interval', 6),
            "backup_folder": get_backup_folder(),
            "backup_keep_days": config.get('backup_keep_days', 7),
            "backup_keep_weeks": config.get('backup_keep_weeks', 4),
            "backup_keep_months": config.get('backup_keep_months', 12)
        })

    # PUT - Update settings
    data = request.json or {}

    if 'backup_enabled' in data:
        config['backup_enabled'] = bool(data['backup_enabled'])
    if 'backup_interval' in data:
        config['backup_interval'] = max(1, min(24, int(data['backup_interval'])))
    if 'backup_folder' in data:
        config['backup_folder'] = data['backup_folder']
    if 'backup_keep_days' in data:
        config['backup_keep_days'] = max(1, int(data['backup_keep_days']))
    if 'backup_keep_weeks' in data:
        config['backup_keep_weeks'] = max(0, int(data['backup_keep_weeks']))
    if 'backup_keep_months' in data:
        config['backup_keep_months'] = max(0, int(data['backup_keep_months']))

    # Save config
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    return jsonify({
        "success": True,
        "message": "Backup-Einstellungen gespeichert",
        "settings": {
            "backup_enabled": config.get('backup_enabled', True),
            "backup_interval": config.get('backup_interval', 6),
            "backup_folder": get_backup_folder(),
            "backup_keep_days": config.get('backup_keep_days', 7),
            "backup_keep_weeks": config.get('backup_keep_weeks', 4),
            "backup_keep_months": config.get('backup_keep_months', 12)
        }
    })


@app.route('/backup/cleanup', methods=['POST'])
def backup_cleanup():
    """Manually trigger backup cleanup"""
    result = cleanup_old_backups()
    if result:
        return jsonify({
            "success": True,
            "message": f"{result['cleaned']} alte Backups geloescht, {result['kept']} behalten"
        })
    else:
        return jsonify({"error": "Cleanup fehlgeschlagen"}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  CapCorn Bridge API")
    print("=" * 60)
    print(f"  Database: {config['database_path']}")
    print(f"  Host:     {config['host']}:{config['port']}")
    print("=" * 60)
    print()
    print("  Endpoints:")
    print("  - GET  /rooms           - Alle Zimmer")
    print("  - GET  /availability    - Verfuegbarkeit pruefen")
    print("  - GET  /bookings        - Buchungen")
    print("  - GET  /guests          - Gaeste suchen")
    print("  - GET  /calendar        - Belegungskalender")
    print("  - POST /option          - Option anlegen")
    print("  - PUT  /book/<resn>     - Buchen")
    print("  - DELETE /cancel/<resn> - Stornieren")
    print()
    print("=" * 60)

    app.run(
        host=config['host'],
        port=config['port'],
        debug=config.get('debug', False)
    )

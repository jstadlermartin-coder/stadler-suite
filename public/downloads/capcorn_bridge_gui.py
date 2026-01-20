# -*- coding: utf-8 -*-
"""
CapCorn Bridge - Background Service Version
============================================
REST API + automatischer Firebase-Sync im Hintergrund.
Laeuft im System-Tray und startet automatisch mit Windows.

(c) 2024-2026 - Hotel Stadler Bridge
"""

# ============================================================================
# VERSION
# ============================================================================
BRIDGE_VERSION = "4.3.0"  # 2026-01-20: OTA-Support (extn, channelName)

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import threading
import json
import os
import sys
import time
import webbrowser
from datetime import datetime
import winreg

# Flask imports
from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc

# Firebase imports
import firebase_admin
from firebase_admin import credentials, firestore

# System tray imports
import pystray
from PIL import Image, ImageDraw

# ============================================================================
# CONFIGURATION
# ============================================================================

def get_config_path():
    """Get config path - works for both script and exe"""
    if getattr(sys, 'frozen', False):
        return os.path.join(os.path.dirname(sys.executable), 'config.json')
    else:
        return os.path.join(os.path.dirname(__file__), 'config.json')

CONFIG_PATH = get_config_path()

def get_firebase_key_path():
    """Get firebase-key.json path - works for both script and exe"""
    if getattr(sys, 'frozen', False):
        # .exe Mode - look next to executable
        return os.path.join(os.path.dirname(sys.executable), 'firebase-key.json')
    else:
        # Development Mode - look next to script
        return os.path.join(os.path.dirname(__file__), 'firebase-key.json')

FIREBASE_KEY_PATH = get_firebase_key_path()

DEFAULT_CONFIG = {
    "database_path": "C:\\datat\\caphotel.mdb",
    "port": 5000,
    "host": "127.0.0.1",
    "debug": False,
    "auto_start": True,
    "auto_sync": True,
    "sync_interval": 15,  # Minutes
    "firebase_project_id": "stadler-suite",
    "minimize_to_tray": True,
    "start_minimized": False,
    # Backup settings
    "backup_enabled": True,
    "backup_interval": 6,  # Hours
    "backup_folder": None,  # Will use default if None
    "backup_keep_days": 7,
    "backup_keep_weeks": 4,
    "backup_keep_months": 12
}

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                config = json.load(f)
                for key, value in DEFAULT_CONFIG.items():
                    if key not in config:
                        config[key] = value
                return config
        except:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(config):
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

config = load_config()

# ============================================================================
# WINDOWS AUTOSTART
# ============================================================================

def get_exe_path():
    """Get path to the executable"""
    if getattr(sys, 'frozen', False):
        return sys.executable
    else:
        return os.path.abspath(__file__)

def set_autostart(enabled):
    """Add/remove from Windows autostart"""
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    app_name = "CapCornBridge"
    exe_path = get_exe_path()

    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enabled:
            # Add --minimized flag for autostart
            winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{exe_path}" --minimized')
        else:
            try:
                winreg.DeleteValue(key, app_name)
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
        return True
    except Exception as e:
        print(f"Autostart error: {e}")
        return False

def is_autostart_enabled():
    """Check if autostart is enabled"""
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    app_name = "CapCornBridge"

    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
        winreg.QueryValueEx(key, app_name)
        winreg.CloseKey(key)
        return True
    except:
        return False

# ============================================================================
# FLASK APP (REST API)
# ============================================================================

flask_app = Flask(__name__)
CORS(flask_app)

def get_db():
    """Verbindung zur Access-Datenbank herstellen"""
    conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={config['database_path']}"
    return pyodbc.connect(conn_str)

def db_query(query, params=None, fetchone=False):
    """Datenbank-Query ausfuehren"""
    conn = get_db()
    cursor = conn.cursor()

    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)

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

@flask_app.route('/')
def index():
    return jsonify({
        "name": "CapCorn Bridge API",
        "version": BRIDGE_VERSION,
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
            "option": "/option (POST) - Buchung anlegen",
            "book": "/book/<resn> (PUT) - Buchung bestaetigen",
            "cancel": "/cancel/<resn> (DELETE) - Stornieren",
            "guest_create": "/guest (POST)",
            "guest_update": "/guest/<gast> (PUT)",
            "service": "/service (POST) - Leistung aufbuchen",
            "blocks": "/blocks - Alle Blockierungen",
            "block_create": "/block (POST) - Zeitraum blockieren",
            "block_delete": "/block/<resn> (DELETE) - Blockierung entfernen",
            "meal": "/meal/<resn> - HP-Buchungen abrufen",
            "meal_add": "/meal/<resn> (POST) - HP hinzufuegen",
            "meal_cancel": "/meal/<resn>/cancel (POST) - HP stornieren",
            "meal_day": "/meal-day?datum=YYYY-MM-DD - HP-Summe pro Tag",
            "invoices": "/invoices",
            "invoice": "/invoices/<rnum>",
            "invoices_by_booking": "/invoices/by-booking/<resn>",
            "invoices_stats": "/invoices/stats - Umsatz-Statistiken",
            "invoices_open": "/invoices/open - Offene Rechnungen",
            "payment_types": "/payment-types - Zahlarten",
            "backup_status": "/backup/status",
            "backup_now": "/backup/now (POST)",
            "backup_list": "/backup/list",
            "backup_settings": "/backup/settings"
        }
    })

@flask_app.route('/health')
def health():
    try:
        conn = get_db()
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@flask_app.route('/rooms')
def get_rooms():
    query = "SELECT zimm, beze, bett, stat, catg, betm, maxv, type FROM ZIM ORDER BY zimm"
    rooms = db_query(query)
    return jsonify({"count": len(rooms), "rooms": [serialize_row(r) for r in rooms]})

@flask_app.route('/rooms/<int:zimm>')
def get_room(zimm):
    query = "SELECT * FROM ZIM WHERE zimm = ?"
    room = db_query(query, (zimm,), fetchone=True)
    if room:
        return jsonify(serialize_row(room))
    return jsonify({"error": "Zimmer nicht gefunden"}), 404

@flask_app.route('/articles')
def get_articles():
    query = "SELECT artn, beze, prei, knto FROM ART ORDER BY artn"
    articles = db_query(query)
    return jsonify({"count": len(articles), "articles": [serialize_row(a) for a in articles]})

@flask_app.route('/channels')
def get_channels():
    try:
        query = "SELECT chid, name FROM CHC ORDER BY chid"
        channels = db_query(query)
        return jsonify({"count": len(channels), "channels": [serialize_row(c) for c in channels]})
    except:
        return jsonify({"count": 0, "channels": []})

@flask_app.route('/categories')
def get_categories():
    query = "SELECT catg, beze, bez1, bett, type, betm, maxv, maxe FROM CAT ORDER BY catg"
    categories = db_query(query)
    return jsonify({"count": len(categories), "categories": [serialize_row(c) for c in categories]})

@flask_app.route('/availability')
def check_availability():
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    category = request.args.get('category', type=int)
    persons = request.args.get('persons', type=int)

    if not date_from or not date_to:
        return jsonify({"error": "Parameter 'from' und 'to' erforderlich"}), 400

    query_booked = "SELECT DISTINCT zimm FROM BUZ WHERE vndt <= ? AND bsdt >= ?"
    booked = db_query(query_booked, (date_to, date_from))
    booked_ids = [b['zimm'] for b in booked]

    query_rooms = """
        SELECT ZIM.zimm, ZIM.beze, ZIM.bett, ZIM.catg, ZIM.betm, ZIM.maxv,
               CAT.beze as kategorie, CAT.prwa, CAT.prsa
        FROM ZIM LEFT JOIN CAT ON ZIM.catg = CAT.catg
        WHERE ZIM.stat = 0
    """
    all_rooms = db_query(query_rooms)

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
        "from": date_from, "to": date_to,
        "total_rooms": len(all_rooms), "booked": len(booked_ids),
        "available_count": len(available), "available": available
    })

@flask_app.route('/bookings')
def get_bookings():
    limit = request.args.get('limit', 500, type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')

    query = f"""
        SELECT TOP {limit} BUC.resn, BUC.gast, BUC.stat, BUC.andf, BUC.ande, BUC.chid,
               GKT.vorn, GKT.nacn, GKT.mail
        FROM BUC LEFT JOIN GKT ON BUC.gast = GKT.gast
        WHERE 1=1
    """
    params = []
    if date_from:
        query += " AND BUC.andf >= ?"
        params.append(date_from)
    if date_to:
        query += " AND BUC.ande <= ?"
        params.append(date_to)
    query += " ORDER BY BUC.resn DESC"

    bookings = db_query(query, params if params else None)
    return jsonify({"count": len(bookings), "bookings": [serialize_row(b) for b in bookings]})

@flask_app.route('/bookings/<int:resn>')
def get_booking(resn):
    query_buc = """
        SELECT BUC.*, GKT.vorn, GKT.nacn, GKT.mail, GKT.teln,
               GKT.stra, GKT.polz, GKT.ortb, GKT.land
        FROM BUC LEFT JOIN GKT ON BUC.gast = GKT.gast
        WHERE BUC.resn = ?
    """
    booking = db_query(query_buc, (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    query_buz = """
        SELECT BUZ.*, ZIM.beze as zimmer_name
        FROM BUZ LEFT JOIN ZIM ON BUZ.zimm = ZIM.zimm
        WHERE BUZ.resn = ?
    """
    rooms = db_query(query_buz, (resn,))

    query_akz = """
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.resn = ?
    """
    account = db_query(query_akz, (resn,))

    result = serialize_row(booking)
    result['rooms'] = [serialize_row(r) for r in rooms]
    result['account'] = [serialize_row(a) for a in account]
    result['account_total'] = sum(a.get('prei', 0) or 0 for a in account)
    return jsonify(result)

@flask_app.route('/guests')
def get_guests():
    limit = request.args.get('limit', 1000, type=int)
    search = request.args.get('q', '')

    if search:
        query = f"""
            SELECT TOP {limit} gast, vorn, nacn, mail, teln, stra, polz, ortb, land
            FROM GKT WHERE vorn LIKE ? OR nacn LIKE ? OR mail LIKE ?
            ORDER BY gast DESC
        """
        search_term = f"%{search}%"
        guests = db_query(query, (search_term, search_term, search_term))
    else:
        query = f"""
            SELECT TOP {limit} gast, vorn, nacn, mail, teln, stra, polz, ortb, land
            FROM GKT ORDER BY gast DESC
        """
        guests = db_query(query)

    return jsonify({"count": len(guests), "guests": [serialize_row(g) for g in guests]})

@flask_app.route('/guests/<int:gast>')
def get_guest(gast):
    query_gkt = "SELECT * FROM GKT WHERE gast = ?"
    guest = db_query(query_gkt, (gast,), fetchone=True)
    if not guest:
        return jsonify({"error": "Gast nicht gefunden"}), 404

    query_buc = "SELECT resn, andf, ande, stat, chid FROM BUC WHERE gast = ? ORDER BY andf DESC"
    bookings = db_query(query_buc, (gast,))

    result = serialize_row(guest)
    result['bookings'] = [serialize_row(b) for b in bookings]
    result['booking_count'] = len(bookings)
    return jsonify(result)

@flask_app.route('/account/<int:resn>')
def get_account(resn):
    query = """
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.resn = ?
        ORDER BY AKZ.edat
    """
    positions = db_query(query, (resn,))
    total = sum(p.get('prei', 0) or 0 for p in positions)
    return jsonify({"resn": resn, "count": len(positions), "total": total, "positions": [serialize_row(p) for p in positions]})

@flask_app.route('/calendar')
def get_calendar():
    from datetime import timedelta
    month = request.args.get('month', datetime.now().month, type=int)
    year = request.args.get('year', datetime.now().year, type=int)
    days = request.args.get('days', 30, type=int)

    start_date = datetime(year, month, 1)
    end_date = start_date + timedelta(days=days)

    query_rooms = "SELECT zimm, beze FROM ZIM ORDER BY zimm"
    rooms = db_query(query_rooms)

    query_bookings = """
        SELECT BUZ.zimm, BUZ.vndt, BUZ.bsdt, BUZ.resn, BUZ.pers,
               BUC.stat, BUC.gast, GKT.nacn
        FROM (BUZ INNER JOIN BUC ON BUZ.resn = BUC.resn)
        LEFT JOIN GKT ON BUC.gast = GKT.gast
        WHERE BUZ.vndt <= ? AND BUZ.bsdt >= ?
    """
    bookings = db_query(query_bookings, (end_date.strftime('%Y-%m-%d'), start_date.strftime('%Y-%m-%d')))

    calendar = []
    for room in rooms:
        room_bookings = [
            {"resn": b['resn'], "from": b['vndt'].strftime('%Y-%m-%d') if b['vndt'] else None,
             "to": b['bsdt'].strftime('%Y-%m-%d') if b['bsdt'] else None,
             "guest": b['nacn'], "persons": b['pers'], "status": b['stat']}
            for b in bookings if b['zimm'] == room['zimm']
        ]
        calendar.append({"zimm": room['zimm'], "name": room['beze'], "bookings": room_bookings})

    return jsonify({"start": start_date.strftime('%Y-%m-%d'), "end": end_date.strftime('%Y-%m-%d'), "rooms": calendar})

@flask_app.route('/stats')
def get_stats():
    from collections import Counter
    stats = {}
    stats['total_guests'] = db_query("SELECT COUNT(*) as c FROM GKT", fetchone=True)['c']
    stats['total_bookings'] = db_query("SELECT COUNT(*) as c FROM BUC", fetchone=True)['c']
    stats['total_rooms'] = db_query("SELECT COUNT(*) as c FROM ZIM", fetchone=True)['c']
    return jsonify(stats)

# ============================================================================
# CHECK-IN / CHECK-OUT
# ============================================================================

@flask_app.route('/checkin/<int:resn>', methods=['PUT'])
def checkin(resn):
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    zimm = request.args.get('zimm', type=int)
    conn = get_db()
    cursor = conn.cursor()

    try:
        if zimm:
            cursor.execute("UPDATE BUZ SET ckin = 2 WHERE resn = ? AND zimm = ?", (resn, zimm))
        else:
            cursor.execute("UPDATE BUZ SET ckin = 2 WHERE resn = ?", (resn,))

        affected = cursor.rowcount
        conn.commit()

        if affected == 0:
            return jsonify({"error": "Keine Zimmer zum Einchecken gefunden"}), 404

        return jsonify({"success": True, "resn": resn, "zimm": zimm, "rooms_checked_in": affected,
                        "message": f"Check-in fuer Buchung {resn} erfolgreich"})
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@flask_app.route('/checkout/<int:resn>', methods=['PUT'])
def checkout(resn):
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    zimm = request.args.get('zimm', type=int)
    conn = get_db()
    cursor = conn.cursor()

    try:
        if zimm:
            cursor.execute("UPDATE BUZ SET ckin = 4 WHERE resn = ? AND zimm = ?", (resn, zimm))
        else:
            cursor.execute("UPDATE BUZ SET ckin = 4 WHERE resn = ?", (resn,))

        affected = cursor.rowcount
        conn.commit()

        if affected == 0:
            return jsonify({"error": "Keine Zimmer zum Auschecken gefunden"}), 404

        return jsonify({"success": True, "resn": resn, "zimm": zimm, "rooms_checked_out": affected,
                        "message": f"Check-out fuer Buchung {resn} erfolgreich"})
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@flask_app.route('/checkin-status/<int:resn>')
def get_checkin_status(resn):
    query = """
        SELECT BUZ.zimm, BUZ.ckin, BUZ.vndt, BUZ.bsdt, ZIM.beze
        FROM BUZ LEFT JOIN ZIM ON BUZ.zimm = ZIM.zimm
        WHERE BUZ.resn = ?
    """
    rooms = db_query(query, (resn,))
    if not rooms:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    status_map = {0: "nicht eingecheckt", 2: "eingecheckt", 4: "ausgecheckt"}
    result = [{"zimm": r['zimm'], "name": r['beze'], "ckin": r['ckin'],
               "status": status_map.get(r['ckin'], f"unbekannt ({r['ckin']})"),
               "von": r['vndt'].strftime('%Y-%m-%d') if r['vndt'] else None,
               "bis": r['bsdt'].strftime('%Y-%m-%d') if r['bsdt'] else None} for r in rooms]
    return jsonify({"resn": resn, "rooms": result})

# ============================================================================
# GAESTEANMELDUNG (Meldewesen)
# ============================================================================

@flask_app.route('/registrations/<int:resn>')
def get_registrations(resn):
    query = """
        SELECT ANM.*, GKI.vorn, GKI.nacn, GKI.gebd, GKI.land
        FROM ANM LEFT JOIN GKI ON ANM.gast = GKI.gkid
        WHERE ANM.resn = ?
    """
    registrations = db_query(query, (resn,))
    status_map = {4: "abgemeldet", 6: "angemeldet"}
    result = []
    for r in registrations:
        row = serialize_row(r)
        row['status_text'] = status_map.get(r.get('stat'), "unbekannt")
        result.append(row)
    return jsonify({"resn": resn, "count": len(result), "registrations": result})

@flask_app.route('/register/<int:resn>', methods=['POST'])
def register_guest(resn):
    booking = db_query("SELECT resn, gast, andf, ande FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    data = request.json or {}
    zimm = data.get('zimm', 0)

    conn = get_db()
    cursor = conn.cursor()

    try:
        gast_id = data.get('gast')

        if not gast_id and data.get('nachname'):
            cursor.execute("SELECT MAX(gkid) FROM GKI")
            max_gkid = cursor.fetchone()[0] or 0
            gast_id = max_gkid + 1
            gebd = datetime.strptime(data['geburtsdatum'], '%Y-%m-%d') if data.get('geburtsdatum') else None
            cursor.execute("INSERT INTO GKI (gkid, vorn, nacn, gebd, land) VALUES (?, ?, ?, ?, ?)",
                          (gast_id, data.get('vorname', ''), data.get('nachname', ''), gebd, data.get('land', '')))

        if not gast_id:
            gast_id = booking['gast']

        cursor.execute("SELECT MAX(annr) FROM ANM")
        max_annr = cursor.fetchone()[0] or 0
        annr = max_annr + 1

        cursor.execute("INSERT INTO ANM (annr, resn, gast, stat, dat1, dat2, pers, kind, numr) VALUES (?, ?, ?, 6, ?, ?, ?, ?, ?)",
                      (annr, resn, gast_id, booking['andf'], booking['ande'], data.get('pers', 1), data.get('kind', 0), zimm))

        conn.commit()
        return jsonify({"success": True, "annr": annr, "resn": resn, "gast": gast_id,
                        "message": f"Gast wurde angemeldet (ANM {annr})"}), 201
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@flask_app.route('/deregister/<int:annr>', methods=['PUT'])
def deregister_guest(annr):
    registration = db_query("SELECT annr, stat FROM ANM WHERE annr = ?", (annr,), fetchone=True)
    if not registration:
        return jsonify({"error": "Anmeldung nicht gefunden"}), 404

    db_execute("UPDATE ANM SET stat = 4 WHERE annr = ?", (annr,))
    return jsonify({"success": True, "annr": annr, "message": f"Gast wurde abgemeldet (ANM {annr})"})

# ============================================================================
# RECHNUNGEN
# ============================================================================

@flask_app.route('/invoices')
def get_invoices():
    limit = request.args.get('limit', 100, type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    guest = request.args.get('guest', type=int)

    query = f"""
        SELECT TOP {limit} REC.rnum, REC.edat, REC.rbez, REC.gast,
               REC.pmv1, REC.pmv2, REC.pmv3, REC.pmta, GKT.vorn, GKT.nacn
        FROM REC LEFT JOIN GKT ON REC.gast = GKT.gast
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
    return jsonify({"count": len(result), "invoices": result})

@flask_app.route('/invoices/<int:rnum>')
def get_invoice(rnum):
    query_rec = """
        SELECT REC.*, GKT.vorn, GKT.nacn, GKT.stra, GKT.polz, GKT.ortb, GKT.land
        FROM REC LEFT JOIN GKT ON REC.gast = GKT.gast
        WHERE REC.rnum = ?
    """
    invoice = db_query(query_rec, (rnum,), fetchone=True)
    if not invoice:
        return jsonify({"error": "Rechnung nicht gefunden"}), 404

    query_positions = """
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.aknr = ?
        ORDER BY AKZ.lfdn
    """
    positions = db_query(query_positions, (invoice.get('aknr'),))

    result = serialize_row(invoice)
    result['positions'] = [serialize_row(p) for p in positions]
    result['position_count'] = len(positions)
    result['total'] = abs(invoice.get('pmv1', 0) or 0) + abs(invoice.get('pmv2', 0) or 0) + abs(invoice.get('pmv3', 0) or 0)
    return jsonify(result)

@flask_app.route('/invoices/by-booking/<int:resn>')
def get_invoices_by_booking(resn):
    booking = db_query("SELECT gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    query = "SELECT REC.rnum, REC.edat, REC.rbez, REC.pmv1, REC.pmv2, REC.pmv3 FROM REC WHERE REC.gast = ? ORDER BY REC.rnum DESC"
    invoices = db_query(query, (booking['gast'],))

    result = []
    for inv in invoices:
        total = abs(inv.get('pmv1', 0) or 0) + abs(inv.get('pmv2', 0) or 0) + abs(inv.get('pmv3', 0) or 0)
        r = serialize_row(inv)
        r['total'] = total
        result.append(r)
    return jsonify({"resn": resn, "gast": booking['gast'], "count": len(result), "invoices": result})

# ============================================================================
# OPTION, BUCHEN, STORNIEREN, GAST, SERVICE
# ============================================================================

@flask_app.route('/option', methods=['POST'])
def create_option():
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

    query_check = "SELECT COUNT(*) as c FROM BUZ WHERE zimm = ? AND vndt <= ? AND bsdt >= ?"
    check = db_query(query_check, (zimm, bis, von), fetchone=True)
    if check['c'] > 0:
        return jsonify({"error": "Zimmer ist im Zeitraum bereits belegt"}), 409

    conn = get_db()
    cursor = conn.cursor()

    try:
        if not gast and data.get('nachname'):
            cursor.execute("SELECT MAX(gast) FROM GKT")
            max_gast = cursor.fetchone()[0] or 0
            gast = max_gast + 1
            cursor.execute("INSERT INTO GKT (gast, vorn, nacn, mail) VALUES (?, ?, ?, ?)",
                          (gast, data.get('vorname', ''), data.get('nachname', ''), data.get('email', '')))

        cursor.execute("SELECT MAX(resn) FROM BUC")
        max_resn = cursor.fetchone()[0] or 0
        resn = max_resn + 1

        cursor.execute("INSERT INTO BUC (resn, gast, stat, andf, ande, chid, bdat) VALUES (?, ?, 2, ?, ?, ?, ?)",
                      (resn, gast, von, bis, channel, datetime.now()))
        cursor.execute("INSERT INTO BUZ (resn, lfdn, zimm, vndt, bsdt, pers, kndr) VALUES (?, 1, ?, ?, ?, ?, ?)",
                      (resn, zimm, von, bis, pers, kndr))

        conn.commit()
        return jsonify({"success": True, "resn": resn, "gast": gast, "message": f"Option {resn} wurde angelegt"}), 201
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@flask_app.route('/book/<int:resn>', methods=['PUT'])
def book_option(resn):
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    db_execute("UPDATE BUC SET stat = 64 WHERE resn = ?", (resn,))
    return jsonify({"success": True, "resn": resn, "message": f"Buchung {resn} wurde bestaetigt"})

@flask_app.route('/cancel/<int:resn>', methods=['DELETE'])
def cancel_booking(resn):
    booking = db_query("SELECT resn, stat FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM BUZ WHERE resn = ?", (resn,))
        cursor.execute("UPDATE BUC SET stat = 65536 WHERE resn = ?", (resn,))
        conn.commit()
        return jsonify({"success": True, "resn": resn, "message": f"Buchung {resn} wurde storniert"})
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@flask_app.route('/guest', methods=['POST'])
def create_guest():
    data = request.json
    if not data or not data.get('nachname'):
        return jsonify({"error": "nachname ist erforderlich"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT MAX(gast) FROM GKT")
        max_gast = cursor.fetchone()[0] or 0
        gast = max_gast + 1

        cursor.execute("INSERT INTO GKT (gast, vorn, nacn, mail, teln, stra, polz, ortb, land) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                      (gast, data.get('vorname', ''), data.get('nachname', ''), data.get('email', ''),
                       data.get('telefon', ''), data.get('strasse', ''), data.get('plz', ''),
                       data.get('ort', ''), data.get('land', '')))
        conn.commit()
        return jsonify({"success": True, "gast": gast, "message": f"Gast {gast} wurde angelegt"}), 201
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

@flask_app.route('/guest/<int:gast>', methods=['PUT'])
def update_guest(gast):
    data = request.json
    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    existing = db_query("SELECT gast FROM GKT WHERE gast = ?", (gast,), fetchone=True)
    if not existing:
        return jsonify({"error": "Gast nicht gefunden"}), 404

    field_map = {'vorname': 'vorn', 'nachname': 'nacn', 'email': 'mail', 'telefon': 'teln',
                 'strasse': 'stra', 'plz': 'polz', 'ort': 'ortb', 'land': 'land'}

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
    return jsonify({"success": True, "gast": gast, "message": f"Gast {gast} wurde aktualisiert"})

@flask_app.route('/service', methods=['POST'])
def add_service():
    data = request.json
    resn = data.get('resn')
    artn = data.get('artn')

    if not resn or not artn:
        return jsonify({"error": "resn und artn sind erforderlich"}), 400

    booking = db_query("SELECT resn, gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    article = db_query("SELECT beze, prei FROM ART WHERE artn = ?", (artn,), fetchone=True)
    prei = data.get('prei', article['prei'] if article else 0)
    bez1 = data.get('bez1', article['beze'] if article else '')

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT MAX(aknr) FROM AKZ")
        max_aknr = cursor.fetchone()[0] or 0
        aknr = max_aknr + 1

        cursor.execute("INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1) VALUES (?, 1, ?, ?, ?, ?, ?, ?)",
                      (aknr, datetime.now(), resn, data.get('zimm', 0), artn, prei, bez1))
        conn.commit()
        return jsonify({"success": True, "aknr": aknr, "resn": resn, "artn": artn, "prei": prei,
                        "message": "Leistung wurde auf Konto gebucht"}), 201
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# BLOCKIERUNGEN (Zeiträume sperren)
# ============================================================================

@flask_app.route('/block', methods=['POST'])
def create_block():
    """Zeitraum blockieren (z.B. Renovierung, Betriebsurlaub)"""
    data = request.json
    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    zimm = data.get('zimm')
    von = data.get('von')
    bis = data.get('bis')
    grund = data.get('grund', 'Blockiert')

    if not all([zimm, von, bis]):
        return jsonify({"error": "zimm, von, bis sind erforderlich"}), 400

    # Check if room is already booked
    query_check = "SELECT COUNT(*) as c FROM BUZ WHERE zimm = ? AND vndt <= ? AND bsdt >= ?"
    check = db_query(query_check, (zimm, bis, von), fetchone=True)
    if check['c'] > 0:
        return jsonify({"error": "Zimmer ist im Zeitraum bereits belegt"}), 409

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Get next reservation number
        cursor.execute("SELECT MAX(resn) FROM BUC")
        max_resn = cursor.fetchone()[0] or 0
        resn = max_resn + 1

        # Create blocking: stat=0 (Option), flgl=4 (visible in calendar)
        cursor.execute("""
            INSERT INTO BUC (resn, gast, stat, flgl, andf, ande, bdat, bemk)
            VALUES (?, 0, 0, 4, ?, ?, ?, ?)
        """, (resn, von, bis, datetime.now(), grund))

        # Create room assignment
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
            "grund": grund,
            "message": f"Blockierung {resn} wurde erstellt"
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@flask_app.route('/block/<int:resn>', methods=['DELETE'])
def delete_block(resn):
    """Blockierung entfernen"""
    # Check if it's a blocking (stat=0, flgl=4)
    booking = db_query("SELECT resn, stat, flgl FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Blockierung nicht gefunden"}), 404

    if booking.get('stat') != 0 or booking.get('flgl') != 4:
        return jsonify({"error": "Dies ist keine Blockierung sondern eine echte Buchung"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM BUZ WHERE resn = ?", (resn,))
        cursor.execute("DELETE FROM BUC WHERE resn = ?", (resn,))
        conn.commit()
        return jsonify({"success": True, "resn": resn, "message": f"Blockierung {resn} wurde entfernt"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@flask_app.route('/blocks')
def get_blocks():
    """Alle aktiven Blockierungen abrufen"""
    query = """
        SELECT BUC.resn, BUC.andf, BUC.ande, BUC.bemk, BUZ.zimm, ZIM.beze
        FROM BUC
        INNER JOIN BUZ ON BUC.resn = BUZ.resn
        LEFT JOIN ZIM ON BUZ.zimm = ZIM.zimm
        WHERE BUC.stat = 0 AND BUC.flgl = 4
        ORDER BY BUC.andf
    """
    blocks = db_query(query)
    return jsonify({
        "count": len(blocks),
        "blocks": [serialize_row(b) for b in blocks]
    })

# ============================================================================
# HALBPENSION (HP) VERWALTUNG
# ============================================================================

# HP Article IDs from CapCorn
HP_ARTICLES = {
    'adult': 53,      # HP Erwachsener
    'child_8_16': 54, # HP Kind 8-16 Jahre
    'child_5_7': 55,  # HP Kind 5-7 Jahre
    'child_0_4': 56   # HP Kind 0-4 Jahre
}

@flask_app.route('/meal/<int:resn>')
def get_meal_bookings(resn):
    """HP-Buchungen für eine Reservierung abrufen"""
    booking = db_query("SELECT resn, gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    # Get all HP items on account
    hp_article_ids = list(HP_ARTICLES.values())
    placeholders = ','.join(['?' for _ in hp_article_ids])
    query = f"""
        SELECT AKZ.*, ART.beze as artikel_name
        FROM AKZ LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.resn = ? AND AKZ.artn IN ({placeholders})
        ORDER BY AKZ.edat
    """
    params = [resn] + hp_article_ids
    meals = db_query(query, params)

    # Calculate totals
    total_positive = sum(m.get('prei', 0) for m in meals if (m.get('prei') or 0) > 0)
    total_negative = sum(m.get('prei', 0) for m in meals if (m.get('prei') or 0) < 0)

    return jsonify({
        "resn": resn,
        "count": len(meals),
        "total_booked": total_positive,
        "total_cancelled": abs(total_negative),
        "net_total": total_positive + total_negative,
        "meals": [serialize_row(m) for m in meals]
    })

@flask_app.route('/meal/<int:resn>', methods=['POST'])
def add_meal(resn):
    """HP für einen Tag hinzufügen"""
    data = request.json
    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    booking = db_query("SELECT resn, gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    datum = data.get('datum')  # Date for the meal
    typ = data.get('typ', 'adult')  # adult, child_8_16, child_5_7, child_0_4
    anzahl = data.get('anzahl', 1)
    zimm = data.get('zimm', 0)

    if not datum:
        return jsonify({"error": "datum ist erforderlich"}), 400

    artn = HP_ARTICLES.get(typ)
    if not artn:
        return jsonify({"error": f"Ungueltiger Typ: {typ}. Erlaubt: {list(HP_ARTICLES.keys())}"}), 400

    # Get article price
    article = db_query("SELECT beze, prei FROM ART WHERE artn = ?", (artn,), fetchone=True)
    if not article:
        return jsonify({"error": f"HP-Artikel {artn} nicht gefunden"}), 404

    prei = article['prei'] * anzahl
    bez1 = f"{article['beze']} ({datum})"

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT MAX(aknr) FROM AKZ")
        max_aknr = cursor.fetchone()[0] or 0
        aknr = max_aknr + 1

        cursor.execute("""
            INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?)
        """, (aknr, datum, resn, zimm, artn, prei, bez1))

        conn.commit()
        return jsonify({
            "success": True,
            "aknr": aknr,
            "resn": resn,
            "datum": datum,
            "typ": typ,
            "anzahl": anzahl,
            "prei": prei,
            "message": f"HP fuer {datum} gebucht"
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@flask_app.route('/meal/<int:resn>/cancel', methods=['POST'])
def cancel_meal(resn):
    """HP für einen Tag stornieren (Minus-Buchung)"""
    data = request.json
    if not data:
        return jsonify({"error": "JSON Body erforderlich"}), 400

    booking = db_query("SELECT resn, gast FROM BUC WHERE resn = ?", (resn,), fetchone=True)
    if not booking:
        return jsonify({"error": "Buchung nicht gefunden"}), 404

    datum = data.get('datum')
    typ = data.get('typ', 'adult')
    anzahl = data.get('anzahl', 1)
    zimm = data.get('zimm', 0)

    if not datum:
        return jsonify({"error": "datum ist erforderlich"}), 400

    artn = HP_ARTICLES.get(typ)
    if not artn:
        return jsonify({"error": f"Ungueltiger Typ: {typ}"}), 400

    # Get article price
    article = db_query("SELECT beze, prei FROM ART WHERE artn = ?", (artn,), fetchone=True)
    if not article:
        return jsonify({"error": f"HP-Artikel {artn} nicht gefunden"}), 404

    # Negative price for cancellation
    prei = -(article['prei'] * anzahl)
    bez1 = f"STORNO: {article['beze']} ({datum})"

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT MAX(aknr) FROM AKZ")
        max_aknr = cursor.fetchone()[0] or 0
        aknr = max_aknr + 1

        cursor.execute("""
            INSERT INTO AKZ (aknr, lfdn, edat, resn, zimm, artn, prei, bez1)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?)
        """, (aknr, datum, resn, zimm, artn, prei, bez1))

        conn.commit()
        return jsonify({
            "success": True,
            "aknr": aknr,
            "resn": resn,
            "datum": datum,
            "typ": typ,
            "anzahl": anzahl,
            "prei": prei,
            "message": f"HP fuer {datum} storniert"
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@flask_app.route('/meal-day')
def get_meals_for_day():
    """HP-Summe für einen bestimmten Tag (für Restaurant/Küche)"""
    datum = request.args.get('datum')
    if not datum:
        datum = datetime.now().strftime('%Y-%m-%d')

    hp_article_ids = list(HP_ARTICLES.values())
    placeholders = ','.join(['?' for _ in hp_article_ids])

    # Get all HP bookings for this date
    query = f"""
        SELECT AKZ.artn, ART.beze, SUM(AKZ.prei) as summe, COUNT(*) as anzahl
        FROM AKZ
        LEFT JOIN ART ON AKZ.artn = ART.artn
        WHERE AKZ.artn IN ({placeholders}) AND AKZ.edat = ?
        GROUP BY AKZ.artn, ART.beze
    """
    params = hp_article_ids + [datum]
    meals = db_query(query, params)

    # Also count from active bookings with HP included
    # (bookings where HP is part of the rate, not separately booked)
    # This would need additional logic based on how HP is stored in bookings

    total_persons = sum(m.get('anzahl', 0) for m in meals)
    total_amount = sum(m.get('summe', 0) or 0 for m in meals)

    return jsonify({
        "datum": datum,
        "total_persons": total_persons,
        "total_amount": total_amount,
        "details": [serialize_row(m) for m in meals]
    })

# ============================================================================
# RECHNUNGS-STATISTIKEN
# ============================================================================

@flask_app.route('/invoices/stats')
def get_invoice_stats():
    """Umsatz-Statistiken für Finanz-App"""
    year = request.args.get('year', type=int)

    # Total invoices and revenue
    if year:
        query_total = """
            SELECT COUNT(*) as count, SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as total
            FROM REC WHERE YEAR(edat) = ?
        """
        totals = db_query(query_total, (year,), fetchone=True)
    else:
        query_total = """
            SELECT COUNT(*) as count, SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as total
            FROM REC
        """
        totals = db_query(query_total, fetchone=True)

    # Revenue by payment type
    query_by_payment = """
        SELECT PMT.payt as zahlart, COUNT(*) as anzahl,
               SUM(ABS(REC.pmv1) + ABS(REC.pmv2) + ABS(REC.pmv3)) as summe
        FROM REC
        LEFT JOIN PMT ON REC.pmt1 = PMT.paym
        GROUP BY PMT.payt
        ORDER BY summe DESC
    """
    by_payment = db_query(query_by_payment)

    # Revenue by year
    query_by_year = """
        SELECT YEAR(edat) as jahr, COUNT(*) as anzahl,
               SUM(ABS(pmv1) + ABS(pmv2) + ABS(pmv3)) as summe
        FROM REC
        GROUP BY YEAR(edat)
        ORDER BY jahr DESC
    """
    by_year = db_query(query_by_year)

    # Open invoices (payment type 1 = "Offene Forderung")
    query_open = """
        SELECT COUNT(*) as count, SUM(pmv1) as total
        FROM REC WHERE pmt1 = 1
    """
    open_invoices = db_query(query_open, fetchone=True)

    return jsonify({
        "total_invoices": totals.get('count', 0) if totals else 0,
        "total_revenue": totals.get('total', 0) if totals else 0,
        "by_payment_type": [serialize_row(p) for p in by_payment],
        "by_year": [serialize_row(y) for y in by_year],
        "open_invoices": {
            "count": open_invoices.get('count', 0) if open_invoices else 0,
            "amount": open_invoices.get('total', 0) if open_invoices else 0
        },
        "filter_year": year
    })

@flask_app.route('/invoices/open')
def get_open_invoices():
    """Offene Rechnungen abrufen"""
    query = """
        SELECT REC.rnum, REC.edat, REC.gast, REC.pmv1,
               GKT.vorn, GKT.nacn
        FROM REC
        LEFT JOIN GKT ON REC.gast = GKT.gast
        WHERE REC.pmt1 = 1
        ORDER BY REC.edat DESC
    """
    invoices = db_query(query)
    total = sum(inv.get('pmv1', 0) or 0 for inv in invoices)

    return jsonify({
        "count": len(invoices),
        "total_open": total,
        "invoices": [serialize_row(inv) for inv in invoices]
    })

@flask_app.route('/payment-types')
def get_payment_types():
    """Alle Zahlarten abrufen"""
    query = "SELECT paym, payt FROM PMT ORDER BY paym"
    types = db_query(query)
    return jsonify({
        "count": len(types),
        "payment_types": [serialize_row(t) for t in types]
    })

# ============================================================================
# BACKUP API ENDPOINTS (GUI)
# ============================================================================

@flask_app.route('/backup/status')
def backup_status_api():
    """Get backup agent status"""
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

    backup_count = 0
    if folder_exists:
        db_name = os.path.splitext(os.path.basename(config['database_path']))[0]
        pattern = os.path.join(backup_folder, f"{db_name}_backup_*.*")
        backup_count = len(glob_module.glob(pattern))

    return jsonify({
        "enabled": config.get('backup_enabled', True),
        "interval_hours": config.get('backup_interval', 6),
        "folder": backup_folder,
        "folder_exists": folder_exists,
        "last_backup": last_backup,
        "last_backup_formatted": last_backup_dt.strftime('%d.%m.%Y %H:%M') if last_backup_dt else None,
        "hours_since_backup": hours_since,
        "backup_needed": hours_since is None or hours_since >= config.get('backup_interval', 6),
        "last_backup_size_mb": config.get('last_backup_size'),
        "backup_count": backup_count
    })

@flask_app.route('/backup/now', methods=['POST'])
def backup_now_api():
    """Trigger immediate backup"""
    force = request.json.get('force', False) if request.json else False
    result = create_backup(force=force)

    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 500

@flask_app.route('/backup/list')
def backup_list_api():
    """List all available backups"""
    return jsonify(list_backups())

@flask_app.route('/backup/settings', methods=['GET', 'PUT'])
def backup_settings_api():
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

    save_config(config)

    return jsonify({
        "success": True,
        "message": "Backup-Einstellungen gespeichert"
    })

# ============================================================================
# FIREBASE SYNC
# ============================================================================

firebase_db = None
firebase_initialized = False
firebase_error_message = None

# ============================================================================
# GUEST DEDUPLICATION HELPERS
# ============================================================================

def normalize_phone(phone):
    """Normalisiert Telefonnummer: nur Ziffern, fuehrende 0 -> 43"""
    if not phone:
        return None
    # Nur Ziffern behalten
    cleaned = ''.join(c for c in str(phone) if c.isdigit())
    if not cleaned:
        return None
    # Oesterreichische Nummern: fuehrende 0 durch 43 ersetzen
    if cleaned.startswith('0') and not cleaned.startswith('00'):
        cleaned = '43' + cleaned[1:]
    # 00 am Anfang entfernen (internationales Format)
    if cleaned.startswith('00'):
        cleaned = cleaned[2:]
    # Mindestlaenge pruefen
    if len(cleaned) < 8:
        return None
    return cleaned

def normalize_email(email):
    """Normalisiert Email: Kleinschreibung, trimmen"""
    if not email:
        return None
    cleaned = str(email).lower().strip()
    if '@' not in cleaned or '.' not in cleaned:
        return None
    return cleaned

def get_guest_key(guest):
    """Erstellt eindeutigen Schluessel fuer Gast basierend auf Telefon oder Email"""
    phone = normalize_phone(guest.get('teln'))
    email = normalize_email(guest.get('mail'))

    # Prioritaet: Telefon > Email > CapHotel-ID als Fallback
    if phone:
        return ('phone', phone)
    if email:
        return ('email', email)
    # Fallback: keine Deduplizierung moeglich
    return ('caphotel', str(guest.get('gast', 0)))

def get_next_customer_number():
    """Holt die naechste Kundennummer mit Firestore Transaction"""
    try:
        counter_ref = firebase_db.collection('counters').document('guests')

        @firestore.transactional
        def update_counter(transaction):
            snapshot = counter_ref.get(transaction=transaction)
            if snapshot.exists:
                current = snapshot.to_dict().get('lastNumber', 100000)
            else:
                current = 100000
            next_number = current + 1
            transaction.set(counter_ref, {'lastNumber': next_number})
            return next_number

        transaction = firebase_db.transaction()
        return update_counter(transaction)
    except Exception as e:
        print(f"Error getting next customer number: {e}")
        # Fallback: Use timestamp-based number
        import random
        return 100000 + random.randint(1, 99999)

def merge_guest_profiles(profiles, bookings_data):
    """Merged mehrere CapHotel-Profile zu einem deduplizierten Gast"""
    if not profiles:
        return None

    # Basis-Daten vom neuesten Profil (hoechste gast-ID)
    profiles_sorted = sorted(profiles, key=lambda p: p.get('gast', 0), reverse=True)
    newest = profiles_sorted[0]

    merged = {
        'firstName': '',
        'lastName': '',
        'email': None,
        'phone': None,
        'street': None,
        'postalCode': None,
        'city': None,
        'country': None,
        'caphotelGuestIds': [],
        'totalBookings': 0,
        'totalRevenue': 0,
        'lastBooking': None
    }

    # Alle Felder von allen Profilen sammeln (nicht-leere Werte bevorzugen)
    for p in profiles_sorted:
        merged['caphotelGuestIds'].append(p.get('gast'))

        if p.get('vorn') and not merged['firstName']:
            merged['firstName'] = p.get('vorn', '')
        if p.get('nacn') and not merged['lastName']:
            merged['lastName'] = p.get('nacn', '')
        if p.get('mail') and not merged['email']:
            merged['email'] = p.get('mail')
        if p.get('teln') and not merged['phone']:
            merged['phone'] = p.get('teln')
        if p.get('stra') and not merged['street']:
            merged['street'] = p.get('stra')
        if p.get('polz') and not merged['postalCode']:
            merged['postalCode'] = p.get('polz')
        if p.get('ortb') and not merged['city']:
            merged['city'] = p.get('ortb')
        if p.get('land') and not merged['country']:
            merged['country'] = p.get('land')

    # Buchungen fuer alle Profile zaehlen
    caphotel_ids = set(merged['caphotelGuestIds'])
    for booking in bookings_data:
        if booking.get('gast') in caphotel_ids:
            merged['totalBookings'] += 1
            merged['totalRevenue'] += booking.get('accountTotal', 0) or 0
            booking_date = booking.get('andf')
            if booking_date:
                if isinstance(booking_date, datetime):
                    booking_date = booking_date.isoformat()
                if not merged['lastBooking'] or booking_date > merged['lastBooking']:
                    merged['lastBooking'] = str(booking_date)

    return merged

def deduplicate_and_sync_guests(bookings_data):
    """Dedupliziert Gaeste und synchronisiert zu Firestore"""
    if not firebase_initialized or not firebase_db:
        print("[Dedup] Firebase nicht initialisiert")
        return {"success": False, "error": "Firebase nicht initialisiert"}

    try:
        now = datetime.now().isoformat()
        print(f"[Dedup] Starting guest deduplication...")

        # 1. Alle Gaeste aus CapHotel laden
        query = """
            SELECT gast, vorn, nacn, mail, teln, stra, polz, ortb, land
            FROM GKT
        """
        all_guests = db_query(query)
        print(f"[Dedup] Loaded {len(all_guests)} guest profiles from CapHotel")

        # 2. Nach normalisierter Telefon/Email gruppieren
        groups = {}
        for guest in all_guests:
            key_type, key_value = get_guest_key(guest)
            key = f"{key_type}:{key_value}"
            if key not in groups:
                groups[key] = []
            groups[key].append(guest)

        print(f"[Dedup] Grouped into {len(groups)} unique guests")

        # 3. Bestehende Lookups laden
        existing_lookups = {}
        try:
            lookups_ref = firebase_db.collection('guestLookup')
            for doc in lookups_ref.stream():
                existing_lookups[doc.id] = doc.to_dict()
        except Exception as e:
            print(f"[Dedup] Error loading existing lookups: {e}")

        # 4. Fuer jede Gruppe: Gast in Firestore anlegen/updaten
        created = 0
        updated = 0

        for key, profiles in groups.items():
            key_type, key_value = key.split(':', 1)
            lookup_id = f"{key_type}_{key_value}"

            # Merged guest data erstellen
            merged = merge_guest_profiles(profiles, bookings_data)
            if not merged:
                continue

            # Normalisierte Kontaktdaten hinzufuegen
            if key_type == 'phone':
                merged['phoneNormalized'] = key_value
            elif key_type == 'email':
                merged['emailNormalized'] = key_value

            # Lookup pruefen ob Gast bereits existiert
            if lookup_id in existing_lookups:
                # Gast existiert - updaten
                lookup_data = existing_lookups[lookup_id]
                guest_id = lookup_data.get('guestId')
                customer_number = lookup_data.get('customerNumber')

                # Guest-Dokument updaten
                merged['id'] = guest_id
                merged['customerNumber'] = customer_number
                merged['updatedAt'] = now

                try:
                    firebase_db.collection('guests').document(guest_id).update(merged)
                    updated += 1
                except Exception as e:
                    print(f"[Dedup] Error updating guest {guest_id}: {e}")
            else:
                # Neuer Gast - anlegen
                customer_number = get_next_customer_number()
                guest_id = f"G{customer_number}"

                merged['id'] = guest_id
                merged['customerNumber'] = customer_number
                merged['createdAt'] = now
                merged['updatedAt'] = now

                try:
                    # Guest-Dokument anlegen
                    firebase_db.collection('guests').document(guest_id).set(merged)

                    # Lookup anlegen (nur fuer phone/email, nicht fuer caphotel fallback)
                    if key_type in ('phone', 'email'):
                        firebase_db.collection('guestLookup').document(lookup_id).set({
                            'guestId': guest_id,
                            'customerNumber': customer_number
                        })

                    created += 1
                except Exception as e:
                    print(f"[Dedup] Error creating guest {guest_id}: {e}")

        print(f"[Dedup] Completed: {created} created, {updated} updated")

        return {
            "success": True,
            "total_profiles": len(all_guests),
            "deduplicated_guests": len(groups),
            "created": created,
            "updated": updated
        }

    except Exception as e:
        print(f"[Dedup] Error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

def init_firebase():
    """Initialize Firebase with Service Account Key (firebase-key.json)"""
    global firebase_db, firebase_initialized, firebase_error_message

    if firebase_initialized:
        return True

    try:
        # Check if firebase-key.json exists
        if not os.path.exists(FIREBASE_KEY_PATH):
            firebase_error_message = f"firebase-key.json nicht gefunden: {FIREBASE_KEY_PATH}"
            print(f"[Firebase] WARNUNG: {firebase_error_message}")
            print("[Firebase] Bitte firebase-key.json neben die .exe kopieren")
            return False

        # Initialize with Service Account Key
        if not firebase_admin._apps:
            cred = credentials.Certificate(FIREBASE_KEY_PATH)
            firebase_admin.initialize_app(cred, options={
                'projectId': config['firebase_project_id']
            })

        firebase_db = firestore.client()
        firebase_initialized = True
        firebase_error_message = None
        print(f"[Firebase] Erfolgreich initialisiert mit Service Account Key")
        return True

    except Exception as e:
        firebase_error_message = str(e)
        print(f"[Firebase] Init-Fehler: {e}")
        return False

def sync_to_firebase():
    """Sync all data from CapHotel to Firebase"""
    if not firebase_initialized:
        if not init_firebase():
            return {"success": False, "error": "Firebase nicht initialisiert"}

    try:
        now = datetime.now().isoformat()
        results = {
            "bookings": 0,
            "guests": 0,
            "deduplicated_guests": 0,
            "articles": 0,
            "rooms": 0,
            "channels": 0
        }

        # Sync Bookings (with account totals for deduplication stats)
        bookings_data = []
        try:
            query = """
                SELECT TOP 1000 BUC.resn, BUC.gast, BUC.stat, BUC.andf, BUC.ande, BUC.chid,
                       BUC.extn, GKT.vorn, GKT.nacn, GKT.mail, CHC.name as channelName
                FROM (BUC LEFT JOIN GKT ON BUC.gast = GKT.gast)
                LEFT JOIN CHC ON BUC.chid = CHC.chid
                ORDER BY BUC.resn DESC
            """
            bookings = db_query(query)
            bookings_data = [serialize_row(b) for b in bookings]

            # Kontosummen fuer jede Buchung laden
            for b in bookings_data:
                try:
                    account_query = "SELECT SUM(prei) as total FROM AKZ WHERE resn = ?"
                    account = db_query(account_query, (b['resn'],), fetchone=True)
                    b['accountTotal'] = account.get('total') if account else 0
                except:
                    b['accountTotal'] = 0
                b['syncedAt'] = now

            firebase_db.collection('caphotelSync').document('bookings').set({
                'items': bookings_data,
                'count': len(bookings_data),
                'syncedAt': now
            })
            results['bookings'] = len(bookings_data)
        except Exception as e:
            print(f"Bookings sync error: {e}")

        # Sync Guests (raw data for caphotelSync)
        try:
            query = """
                SELECT TOP 2000 gast, vorn, nacn, mail, teln, stra, polz, ortb, land
                FROM GKT ORDER BY gast DESC
            """
            guests = db_query(query)
            guests_data = [serialize_row(g) for g in guests]
            for g in guests_data:
                g['syncedAt'] = now

            firebase_db.collection('caphotelSync').document('guests').set({
                'items': guests_data,
                'count': len(guests_data),
                'syncedAt': now
            })
            results['guests'] = len(guests_data)
        except Exception as e:
            print(f"Guests sync error: {e}")

        # Deduplicate guests and sync to 'guests' collection
        try:
            dedup_result = deduplicate_and_sync_guests(bookings_data)
            if dedup_result.get('success'):
                results['deduplicated_guests'] = dedup_result.get('deduplicated_guests', 0)
                print(f"[Sync] Deduplicated {results['deduplicated_guests']} guests")
        except Exception as e:
            print(f"Guest deduplication error: {e}")

        # Sync Articles
        try:
            query = "SELECT artn, beze, prei, knto FROM ART ORDER BY artn"
            articles = db_query(query)
            articles_data = [serialize_row(a) for a in articles]
            for a in articles_data:
                a['syncedAt'] = now

            firebase_db.collection('caphotelSync').document('articles').set({
                'items': articles_data,
                'count': len(articles_data),
                'syncedAt': now
            })
            results['articles'] = len(articles_data)
        except Exception as e:
            print(f"Articles sync error: {e}")

        # Sync Rooms
        try:
            query = "SELECT zimm, beze, bett, stat, catg FROM ZIM ORDER BY zimm"
            rooms = db_query(query)
            rooms_data = [serialize_row(r) for r in rooms]
            for r in rooms_data:
                r['syncedAt'] = now

            firebase_db.collection('caphotelSync').document('rooms').set({
                'items': rooms_data,
                'count': len(rooms_data),
                'syncedAt': now
            })
            results['rooms'] = len(rooms_data)
        except Exception as e:
            print(f"Rooms sync error: {e}")

        # Sync Channels
        try:
            query = "SELECT chid, name FROM CHN ORDER BY chid"
            channels = db_query(query)
            channels_data = [serialize_row(c) for c in channels]
            for c in channels_data:
                c['syncedAt'] = now

            firebase_db.collection('caphotelSync').document('channels').set({
                'items': channels_data,
                'count': len(channels_data),
                'syncedAt': now
            })
            results['channels'] = len(channels_data)
        except Exception as e:
            print(f"Channels sync error: {e}")

        # Update sync status
        firebase_db.collection('caphotelSync').document('status').set({
            'lastSync': now,
            'lastSyncSuccess': True,
            'syncInProgress': False,
            'bookingsCount': results['bookings'],
            'guestsCount': results['guests'],
            'deduplicatedGuestsCount': results['deduplicated_guests'],
            'autoSyncEnabled': config.get('auto_sync', True),
            'autoSyncInterval': config.get('sync_interval', 15),
            'syncSource': 'bridge'
        })

        return {"success": True, "results": results, "timestamp": now}

    except Exception as e:
        print(f"Sync error: {e}")
        try:
            firebase_db.collection('caphotelSync').document('status').set({
                'lastSync': datetime.now().isoformat(),
                'lastSyncSuccess': False,
                'syncInProgress': False,
                'error': str(e)
            }, merge=True)
        except:
            pass
        return {"success": False, "error": str(e)}

# ============================================================================
# AUTO-SYNC THREAD
# ============================================================================

sync_thread = None
sync_running = False
last_sync_time = None
last_sync_result = None

def auto_sync_loop():
    """Background thread for automatic syncing"""
    global last_sync_time, last_sync_result

    while sync_running:
        if config.get('auto_sync', True):
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting auto-sync...")
            result = sync_to_firebase()
            last_sync_time = datetime.now()
            last_sync_result = result

            if result.get('success'):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Sync complete: {result.get('results')}")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Sync failed: {result.get('error')}")

        # Wait for next sync interval
        interval_seconds = config.get('sync_interval', 15) * 60
        for _ in range(interval_seconds):
            if not sync_running:
                break
            time.sleep(1)

def start_auto_sync():
    """Start the auto-sync background thread"""
    global sync_thread, sync_running

    if sync_running:
        return

    sync_running = True
    sync_thread = threading.Thread(target=auto_sync_loop, daemon=True)
    sync_thread.start()

def stop_auto_sync():
    """Stop the auto-sync background thread"""
    global sync_running
    sync_running = False

# ============================================================================
# BACKUP AGENT
# ============================================================================

import shutil
import glob as glob_module
import hashlib

backup_thread = None
backup_running = False
last_backup_time = None
last_backup_result = None

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
    """Create a backup of the Access database"""
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
        save_config(config)

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
    """Cleanup old backups based on retention policy"""
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

def auto_backup_loop():
    """Background thread for automatic backups"""
    global last_backup_time, last_backup_result

    while backup_running:
        if config.get('backup_enabled', True):
            # Check if backup is needed
            last_backup = config.get('last_backup')
            backup_needed = True

            if last_backup:
                try:
                    last_backup_dt = datetime.fromisoformat(last_backup)
                    hours_since = (datetime.now() - last_backup_dt).total_seconds() / 3600
                    backup_needed = hours_since >= config.get('backup_interval', 6)
                except:
                    pass

            if backup_needed:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting auto-backup...")
                result = create_backup(force=False)
                last_backup_time = datetime.now()
                last_backup_result = result

                if result.get('success'):
                    if result.get('skipped'):
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Backup skipped (no changes)")
                    else:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Backup complete: {result.get('backup_filename')}")
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Backup failed: {result.get('message')}")

        # Wait 30 minutes before next check
        for _ in range(1800):
            if not backup_running:
                break
            time.sleep(1)

def start_auto_backup():
    """Start the auto-backup background thread"""
    global backup_thread, backup_running

    if backup_running:
        return

    backup_running = True
    backup_thread = threading.Thread(target=auto_backup_loop, daemon=True)
    backup_thread.start()

def stop_auto_backup():
    """Stop the auto-backup background thread"""
    global backup_running
    backup_running = False

# ============================================================================
# SYSTEM TRAY
# ============================================================================

def create_tray_image():
    """Create a simple icon for system tray"""
    # Create a 64x64 image with a simple design
    image = Image.new('RGB', (64, 64), color=(30, 64, 175))  # Blue background
    draw = ImageDraw.Draw(image)

    # Draw a simple "B" for Bridge
    draw.rectangle([16, 12, 48, 52], fill=(255, 255, 255))
    draw.rectangle([20, 16, 44, 48], fill=(30, 64, 175))
    draw.rectangle([20, 16, 36, 30], fill=(255, 255, 255))
    draw.rectangle([20, 34, 36, 48], fill=(255, 255, 255))

    return image

tray_icon = None
gui_app = None

def show_window(icon=None, item=None):
    """Show the main window"""
    global gui_app
    if gui_app and gui_app.root:
        gui_app.root.deiconify()
        gui_app.root.lift()

def manual_sync(icon=None, item=None):
    """Trigger manual sync from tray"""
    threading.Thread(target=sync_to_firebase, daemon=True).start()

def manual_backup(icon=None, item=None):
    """Trigger manual backup from tray"""
    threading.Thread(target=lambda: create_backup(force=True), daemon=True).start()

def quit_app(icon=None, item=None):
    """Quit the application"""
    global tray_icon, gui_app, sync_running, backup_running

    sync_running = False
    backup_running = False

    if tray_icon:
        tray_icon.stop()

    if gui_app and gui_app.root:
        gui_app.root.quit()
        gui_app.root.destroy()

    os._exit(0)

def setup_tray():
    """Setup system tray icon"""
    global tray_icon

    image = create_tray_image()

    menu = pystray.Menu(
        pystray.MenuItem("Einstellungen oeffnen", show_window, default=True),
        pystray.MenuItem("Jetzt synchronisieren", manual_sync),
        pystray.MenuItem("Jetzt Backup erstellen", manual_backup),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Beenden", quit_app)
    )

    tray_icon = pystray.Icon("CapCornBridge", image, f"CapCorn Bridge v{BRIDGE_VERSION}", menu)

    # Run tray in background thread
    threading.Thread(target=tray_icon.run, daemon=True).start()

# ============================================================================
# GUI APPLICATION
# ============================================================================

class BridgeApp:
    def __init__(self, root, start_minimized=False):
        self.root = root
        self.root.title(f"CapCorn Bridge v{BRIDGE_VERSION} - Einstellungen")
        self.root.geometry("600x580")
        self.root.resizable(False, False)

        self.server_thread = None
        self.server_running = False

        self.create_widgets()
        self.load_settings()

        # Minimize to tray on close
        self.root.protocol("WM_DELETE_WINDOW", self.minimize_to_tray)

        # Start minimized if requested
        if start_minimized:
            self.root.withdraw()

        # Auto-start server
        self.root.after(500, self.auto_start)

    def auto_start(self):
        """Auto-start server and sync on launch"""
        self.start_server()

        # Initialize Firebase and start auto-sync
        if config.get('auto_sync', True):
            threading.Thread(target=self.init_and_sync, daemon=True).start()

    def init_and_sync(self):
        """Initialize Firebase and start auto-sync and auto-backup"""
        if init_firebase():
            start_auto_sync()
            self.root.after(0, lambda: self.update_sync_status("Auto-Sync aktiv"))
        else:
            # Show specific error message
            if firebase_error_message and "nicht gefunden" in firebase_error_message:
                self.root.after(0, lambda: self.update_sync_status("firebase-key.json fehlt!"))
            else:
                error_msg = firebase_error_message or "Unbekannter Fehler"
                self.root.after(0, lambda: self.update_sync_status(f"Firebase-Fehler: {error_msg[:30]}"))

        # Start auto-backup
        if config.get('backup_enabled', True):
            start_auto_backup()
            print("[Backup] Auto-Backup gestartet")

    def minimize_to_tray(self):
        """Minimize to system tray instead of closing"""
        self.root.withdraw()

    def create_widgets(self):
        # Main frame with tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Tab 1: Status
        status_tab = ttk.Frame(notebook, padding="15")
        notebook.add(status_tab, text="Status")

        # Status section
        ttk.Label(status_tab, text="CapCorn Bridge", font=('Segoe UI', 16, 'bold')).pack(anchor=tk.W)
        ttk.Label(status_tab, text="Hotel Stadler - Datenbank-Synchronisation",
                  font=('Segoe UI', 10), foreground='gray').pack(anchor=tk.W, pady=(0, 20))

        # Server Status
        server_frame = ttk.LabelFrame(status_tab, text="REST API Server", padding="10")
        server_frame.pack(fill=tk.X, pady=(0, 15))

        status_row = ttk.Frame(server_frame)
        status_row.pack(fill=tk.X)

        self.server_indicator = tk.Canvas(status_row, width=16, height=16, highlightthickness=0)
        self.server_indicator.pack(side=tk.LEFT, padx=(0, 10))
        self.draw_indicator(self.server_indicator, False)

        self.server_status_label = ttk.Label(status_row, text="Gestoppt", font=('Segoe UI', 11))
        self.server_status_label.pack(side=tk.LEFT)

        self.start_btn = ttk.Button(status_row, text="Starten", command=self.toggle_server)
        self.start_btn.pack(side=tk.RIGHT)

        # Sync Status
        sync_frame = ttk.LabelFrame(status_tab, text="Firebase Sync", padding="10")
        sync_frame.pack(fill=tk.X, pady=(0, 15))

        sync_row = ttk.Frame(sync_frame)
        sync_row.pack(fill=tk.X)

        self.sync_indicator = tk.Canvas(sync_row, width=16, height=16, highlightthickness=0)
        self.sync_indicator.pack(side=tk.LEFT, padx=(0, 10))
        self.draw_indicator(self.sync_indicator, False)

        self.sync_status_label = ttk.Label(sync_row, text="Nicht initialisiert", font=('Segoe UI', 11))
        self.sync_status_label.pack(side=tk.LEFT)

        self.sync_btn = ttk.Button(sync_row, text="Jetzt synchronisieren", command=self.manual_sync)
        self.sync_btn.pack(side=tk.RIGHT)

        # Last Sync Info
        self.last_sync_label = ttk.Label(sync_frame, text="", foreground='gray', font=('Segoe UI', 9))
        self.last_sync_label.pack(anchor=tk.W, pady=(10, 0))

        # Tab 2: Settings
        settings_tab = ttk.Frame(notebook, padding="15")
        notebook.add(settings_tab, text="Einstellungen")

        # Database path
        db_frame = ttk.LabelFrame(settings_tab, text="Datenbank-Pfad", padding="10")
        db_frame.pack(fill=tk.X, pady=(0, 15))

        self.db_path_var = tk.StringVar(value=config.get('database_path', ''))

        path_row = ttk.Frame(db_frame)
        path_row.pack(fill=tk.X)

        path_entry = ttk.Entry(path_row, textvariable=self.db_path_var, width=50)
        path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))

        browse_btn = ttk.Button(path_row, text="...", width=3, command=self.browse_database)
        browse_btn.pack(side=tk.RIGHT)

        test_db_btn = ttk.Button(db_frame, text="Verbindung testen", command=self.test_connection)
        test_db_btn.pack(anchor=tk.W, pady=(10, 0))

        # Sync Settings
        sync_settings_frame = ttk.LabelFrame(settings_tab, text="Synchronisation", padding="10")
        sync_settings_frame.pack(fill=tk.X, pady=(0, 15))

        self.auto_sync_var = tk.BooleanVar(value=config.get('auto_sync', True))
        auto_sync_cb = ttk.Checkbutton(sync_settings_frame, text="Automatische Synchronisation aktivieren",
                                        variable=self.auto_sync_var)
        auto_sync_cb.pack(anchor=tk.W)

        interval_row = ttk.Frame(sync_settings_frame)
        interval_row.pack(fill=tk.X, pady=(10, 0))

        ttk.Label(interval_row, text="Sync-Interval:").pack(side=tk.LEFT)

        self.interval_var = tk.StringVar(value=str(config.get('sync_interval', 15)))
        interval_combo = ttk.Combobox(interval_row, textvariable=self.interval_var,
                                       values=["5", "10", "15", "30", "60"], width=5, state='readonly')
        interval_combo.pack(side=tk.LEFT, padx=(10, 5))
        ttk.Label(interval_row, text="Minuten").pack(side=tk.LEFT)

        # Autostart
        autostart_frame = ttk.LabelFrame(settings_tab, text="Windows-Autostart", padding="10")
        autostart_frame.pack(fill=tk.X, pady=(0, 15))

        self.autostart_var = tk.BooleanVar(value=is_autostart_enabled())
        autostart_cb = ttk.Checkbutton(autostart_frame,
                                        text="Bridge automatisch starten wenn Windows startet",
                                        variable=self.autostart_var)
        autostart_cb.pack(anchor=tk.W)

        ttk.Label(autostart_frame, text="(Laeuft minimiert im Hintergrund)",
                  foreground='gray', font=('Segoe UI', 9)).pack(anchor=tk.W)

        # Save button
        save_btn = ttk.Button(settings_tab, text="Einstellungen speichern", command=self.save_settings)
        save_btn.pack(anchor=tk.E, pady=(10, 0))

        # Tab 3: Info
        info_tab = ttk.Frame(notebook, padding="15")
        notebook.add(info_tab, text="Info")

        ttk.Label(info_tab, text=f"CapCorn Bridge v{BRIDGE_VERSION}", font=('Segoe UI', 14, 'bold')).pack(anchor=tk.W)
        ttk.Label(info_tab, text="Datenbank-Synchronisation & Backup fuer Hotel Stadler",
                  font=('Segoe UI', 10)).pack(anchor=tk.W, pady=(5, 20))

        info_text = """Diese Bridge verbindet Ihre CapHotel-Datenbank mit der
Stadler Suite Web-App.

Funktionen:
• REST API fuer lokale Datenbank-Abfragen
• Automatische Synchronisation zu Firebase
• Automatisches Datenbank-Backup
• Intelligente Backup-Aufbewahrung
• Laeuft im Hintergrund (System-Tray)
• Startet automatisch mit Windows

Die Daten werden automatisch in die Cloud synchronisiert
und die Datenbank wird regelmaessig gesichert."""

        ttk.Label(info_tab, text=info_text, justify=tk.LEFT, font=('Segoe UI', 10)).pack(anchor=tk.W)

        link_frame = ttk.Frame(info_tab)
        link_frame.pack(anchor=tk.W, pady=(20, 0))

        ttk.Label(link_frame, text="Web-App:").pack(side=tk.LEFT)
        link = ttk.Label(link_frame, text="https://stadler-suite.web.app",
                         foreground='blue', cursor='hand2', font=('Segoe UI', 10, 'underline'))
        link.pack(side=tk.LEFT, padx=(5, 0))
        link.bind('<Button-1>', lambda e: webbrowser.open('https://stadler-suite.web.app'))

        # Tab 4: Backup
        backup_tab = ttk.Frame(notebook, padding="15")
        notebook.add(backup_tab, text="Backup")

        ttk.Label(backup_tab, text="Datenbank-Backup", font=('Segoe UI', 14, 'bold')).pack(anchor=tk.W)
        ttk.Label(backup_tab, text="Automatische Sicherung der Access-Datenbank",
                  font=('Segoe UI', 10), foreground='gray').pack(anchor=tk.W, pady=(0, 15))

        # Backup Status Frame
        backup_status_frame = ttk.LabelFrame(backup_tab, text="Backup-Status", padding="10")
        backup_status_frame.pack(fill=tk.X, pady=(0, 15))

        backup_status_row = ttk.Frame(backup_status_frame)
        backup_status_row.pack(fill=tk.X)

        self.backup_indicator = tk.Canvas(backup_status_row, width=16, height=16, highlightthickness=0)
        self.backup_indicator.pack(side=tk.LEFT, padx=(0, 10))
        self.draw_indicator(self.backup_indicator, False)

        self.backup_status_label = ttk.Label(backup_status_row, text="Kein Backup vorhanden", font=('Segoe UI', 11))
        self.backup_status_label.pack(side=tk.LEFT)

        self.backup_now_btn = ttk.Button(backup_status_row, text="Jetzt sichern", command=self.do_backup)
        self.backup_now_btn.pack(side=tk.RIGHT)

        # Last backup info
        self.last_backup_label = ttk.Label(backup_status_frame, text="", foreground='gray', font=('Segoe UI', 9))
        self.last_backup_label.pack(anchor=tk.W, pady=(10, 0))

        # Backup Settings Frame
        backup_settings_frame = ttk.LabelFrame(backup_tab, text="Backup-Einstellungen", padding="10")
        backup_settings_frame.pack(fill=tk.X, pady=(0, 15))

        self.backup_enabled_var = tk.BooleanVar(value=config.get('backup_enabled', True))
        backup_cb = ttk.Checkbutton(backup_settings_frame, text="Automatisches Backup aktivieren",
                                     variable=self.backup_enabled_var)
        backup_cb.pack(anchor=tk.W)

        backup_interval_row = ttk.Frame(backup_settings_frame)
        backup_interval_row.pack(fill=tk.X, pady=(10, 0))

        ttk.Label(backup_interval_row, text="Backup-Intervall:").pack(side=tk.LEFT)

        self.backup_interval_var = tk.StringVar(value=str(config.get('backup_interval', 6)))
        backup_interval_combo = ttk.Combobox(backup_interval_row, textvariable=self.backup_interval_var,
                                              values=["1", "2", "4", "6", "12", "24"], width=5, state='readonly')
        backup_interval_combo.pack(side=tk.LEFT, padx=(10, 5))
        ttk.Label(backup_interval_row, text="Stunden").pack(side=tk.LEFT)

        # Retention settings
        retention_frame = ttk.Frame(backup_settings_frame)
        retention_frame.pack(fill=tk.X, pady=(10, 0))

        ttk.Label(retention_frame, text="Aufbewahren:", font=('Segoe UI', 9)).pack(anchor=tk.W)

        retention_details = ttk.Label(retention_frame,
                                       text=f"• Alle Backups der letzten {config.get('backup_keep_days', 7)} Tage\n"
                                            f"• Woechentlich fuer {config.get('backup_keep_weeks', 4)} Wochen\n"
                                            f"• Monatlich fuer {config.get('backup_keep_months', 12)} Monate",
                                       font=('Segoe UI', 9), foreground='gray')
        retention_details.pack(anchor=tk.W, padx=(10, 0))

        # Backup folder
        folder_frame = ttk.Frame(backup_settings_frame)
        folder_frame.pack(fill=tk.X, pady=(10, 0))

        ttk.Label(folder_frame, text="Backup-Ordner:").pack(side=tk.LEFT)

        self.backup_folder_var = tk.StringVar(value=get_backup_folder())
        folder_entry = ttk.Entry(folder_frame, textvariable=self.backup_folder_var, width=35)
        folder_entry.pack(side=tk.LEFT, padx=(10, 5))

        browse_backup_btn = ttk.Button(folder_frame, text="...", width=3, command=self.browse_backup_folder)
        browse_backup_btn.pack(side=tk.LEFT)

        open_folder_btn = ttk.Button(folder_frame, text="Oeffnen", command=self.open_backup_folder)
        open_folder_btn.pack(side=tk.LEFT, padx=(5, 0))

        # Save backup settings button
        save_backup_btn = ttk.Button(backup_settings_frame, text="Backup-Einstellungen speichern",
                                      command=self.save_backup_settings)
        save_backup_btn.pack(anchor=tk.E, pady=(15, 0))

        # Backup List Frame
        backup_list_frame = ttk.LabelFrame(backup_tab, text="Vorhandene Backups", padding="10")
        backup_list_frame.pack(fill=tk.BOTH, expand=True)

        # Backup listbox with scrollbar
        list_container = ttk.Frame(backup_list_frame)
        list_container.pack(fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(list_container)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.backup_listbox = tk.Listbox(list_container, height=5, font=('Consolas', 9),
                                          yscrollcommand=scrollbar.set)
        self.backup_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.backup_listbox.yview)

        # Backup list buttons
        list_btn_frame = ttk.Frame(backup_list_frame)
        list_btn_frame.pack(fill=tk.X, pady=(10, 0))

        refresh_btn = ttk.Button(list_btn_frame, text="Aktualisieren", command=self.refresh_backup_list)
        refresh_btn.pack(side=tk.LEFT)

        self.backup_count_label = ttk.Label(list_btn_frame, text="0 Backups", foreground='gray')
        self.backup_count_label.pack(side=tk.RIGHT)

        # Load initial backup status
        self.root.after(1000, self.refresh_backup_status)

    def draw_indicator(self, canvas, active):
        canvas.delete('all')
        color = '#22c55e' if active else '#ef4444'
        canvas.create_oval(2, 2, 14, 14, fill=color, outline=color)

    def browse_database(self):
        filename = filedialog.askopenfilename(
            title="Datenbank auswaehlen",
            filetypes=[("Access Datenbank", "*.mdb *.accdb"), ("Alle Dateien", "*.*")],
            initialdir=os.path.dirname(self.db_path_var.get()) if self.db_path_var.get() else "C:\\"
        )
        if filename:
            self.db_path_var.set(filename)

    def load_settings(self):
        self.db_path_var.set(config.get('database_path', ''))
        self.auto_sync_var.set(config.get('auto_sync', True))
        self.interval_var.set(str(config.get('sync_interval', 15)))
        self.autostart_var.set(is_autostart_enabled())

    def save_settings(self):
        config['database_path'] = self.db_path_var.get()
        config['auto_sync'] = self.auto_sync_var.get()
        config['sync_interval'] = int(self.interval_var.get())
        save_config(config)

        # Update autostart
        set_autostart(self.autostart_var.get())

        messagebox.showinfo("Gespeichert", "Einstellungen wurden gespeichert!")

    def test_connection(self):
        db_path = self.db_path_var.get()

        if not db_path:
            messagebox.showerror("Fehler", "Bitte waehlen Sie eine Datenbank aus.")
            return

        if not os.path.exists(db_path):
            messagebox.showerror("Fehler", f"Datenbank nicht gefunden:\n{db_path}")
            return

        try:
            conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path}"
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM ZIM")
            count = cursor.fetchone()[0]
            conn.close()

            messagebox.showinfo("Erfolg", f"Verbindung erfolgreich!\n\n{count} Zimmer gefunden.")

        except Exception as e:
            messagebox.showerror("Fehler", f"Verbindungsfehler:\n\n{str(e)}")

    def toggle_server(self):
        if self.server_running:
            self.stop_server()
        else:
            self.start_server()

    def start_server(self):
        config['database_path'] = self.db_path_var.get()

        if not config['database_path'] or not os.path.exists(config['database_path']):
            return

        def run_server():
            try:
                flask_app.run(host=config['host'], port=config['port'], debug=False, use_reloader=False)
            except Exception as e:
                print(f"Server error: {e}")

        self.server_thread = threading.Thread(target=run_server, daemon=True)
        self.server_thread.start()

        self.server_running = True
        self.draw_indicator(self.server_indicator, True)
        self.server_status_label.config(text=f"Laeuft auf Port {config['port']}")
        self.start_btn.config(text="Stoppen")

    def stop_server(self):
        self.server_running = False
        self.draw_indicator(self.server_indicator, False)
        self.server_status_label.config(text="Gestoppt")
        self.start_btn.config(text="Starten")

    def update_sync_status(self, text):
        self.sync_status_label.config(text=text)
        if "aktiv" in text.lower() or "erfolg" in text.lower():
            self.draw_indicator(self.sync_indicator, True)
        else:
            self.draw_indicator(self.sync_indicator, False)

    def manual_sync(self):
        self.sync_btn.config(state='disabled')
        self.update_sync_status("Synchronisiere...")

        def do_sync():
            result = sync_to_firebase()

            def update_ui():
                self.sync_btn.config(state='normal')
                if result.get('success'):
                    r = result.get('results', {})
                    self.update_sync_status("Sync erfolgreich!")
                    self.last_sync_label.config(
                        text=f"Letzter Sync: {datetime.now().strftime('%d.%m.%Y %H:%M')} - "
                             f"{r.get('bookings', 0)} Buchungen, {r.get('guests', 0)} Gaeste"
                    )
                else:
                    self.update_sync_status(f"Fehler: {result.get('error', 'Unbekannt')}")

            self.root.after(0, update_ui)

        threading.Thread(target=do_sync, daemon=True).start()

    # ========================================================================
    # BACKUP METHODS
    # ========================================================================

    def refresh_backup_status(self):
        """Refresh backup status display"""
        last_backup = config.get('last_backup')

        if last_backup:
            try:
                last_backup_dt = datetime.fromisoformat(last_backup)
                hours_since = (datetime.now() - last_backup_dt).total_seconds() / 3600
                size_mb = config.get('last_backup_size', 0)

                self.draw_indicator(self.backup_indicator, True)
                self.backup_status_label.config(text=f"Letztes Backup vor {hours_since:.1f} Stunden")
                self.last_backup_label.config(
                    text=f"Letzte Sicherung: {last_backup_dt.strftime('%d.%m.%Y %H:%M')} ({size_mb} MB)"
                )
            except:
                self.draw_indicator(self.backup_indicator, False)
                self.backup_status_label.config(text="Kein Backup vorhanden")
                self.last_backup_label.config(text="")
        else:
            self.draw_indicator(self.backup_indicator, False)
            self.backup_status_label.config(text="Kein Backup vorhanden")
            self.last_backup_label.config(text="")

        # Refresh backup list
        self.refresh_backup_list()

    def refresh_backup_list(self):
        """Refresh the backup list"""
        self.backup_listbox.delete(0, tk.END)

        result = list_backups()
        backups = result.get('backups', [])

        for b in backups:
            line = f"{b['date_formatted']}  |  {b['size_mb']:>6.2f} MB  |  {b['filename']}"
            self.backup_listbox.insert(tk.END, line)

        count = result.get('count', 0)
        total_size = result.get('total_size_mb', 0)
        self.backup_count_label.config(text=f"{count} Backups ({total_size:.1f} MB)")

    def do_backup(self):
        """Perform manual backup"""
        self.backup_now_btn.config(state='disabled')
        self.backup_status_label.config(text="Backup wird erstellt...")

        def run_backup():
            result = create_backup(force=True)

            def update_ui():
                self.backup_now_btn.config(state='normal')
                if result.get('success'):
                    if result.get('skipped'):
                        messagebox.showinfo("Backup", "Keine Aenderungen seit letztem Backup.")
                    else:
                        messagebox.showinfo("Backup",
                                            f"Backup erfolgreich erstellt!\n\n"
                                            f"Datei: {result.get('backup_filename')}\n"
                                            f"Groesse: {result.get('size_mb')} MB")
                    self.refresh_backup_status()
                else:
                    messagebox.showerror("Backup-Fehler", result.get('message', 'Unbekannter Fehler'))
                    self.backup_status_label.config(text="Backup fehlgeschlagen")

            self.root.after(0, update_ui)

        threading.Thread(target=run_backup, daemon=True).start()

    def save_backup_settings(self):
        """Save backup settings"""
        config['backup_enabled'] = self.backup_enabled_var.get()
        config['backup_interval'] = int(self.backup_interval_var.get())
        config['backup_folder'] = self.backup_folder_var.get() if self.backup_folder_var.get() else None
        save_config(config)

        messagebox.showinfo("Gespeichert", "Backup-Einstellungen wurden gespeichert!")

    def browse_backup_folder(self):
        """Browse for backup folder"""
        folder = filedialog.askdirectory(
            title="Backup-Ordner auswaehlen",
            initialdir=self.backup_folder_var.get() if self.backup_folder_var.get() else os.path.dirname(config['database_path'])
        )
        if folder:
            self.backup_folder_var.set(folder)

    def open_backup_folder(self):
        """Open backup folder in file explorer"""
        folder = get_backup_folder()
        if os.path.exists(folder):
            os.startfile(folder)
        else:
            messagebox.showinfo("Info", f"Ordner existiert noch nicht:\n{folder}\n\nErstellen Sie zuerst ein Backup.")

# ============================================================================
# MAIN
# ============================================================================

def main():
    global gui_app

    # Check if starting minimized (from autostart)
    start_minimized = '--minimized' in sys.argv

    # Setup system tray first
    setup_tray()

    # Create main window
    root = tk.Tk()

    style = ttk.Style()
    style.theme_use('clam')

    gui_app = BridgeApp(root, start_minimized=start_minimized)

    root.mainloop()

if __name__ == '__main__':
    main()

import mysql.connector
from mysql.connector import Error
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), 'appointments.db')

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    doctor_name TEXT,
    specialty TEXT,
    hospital TEXT,
    fee TEXT,
    patient_name TEXT NOT NULL,
    patient_email TEXT,
    patient_phone TEXT,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'booked',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    restaurant_name TEXT,
    cuisine TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    reservation_date TEXT NOT NULL,
    reservation_time TEXT NOT NULL,
    party_size INTEGER,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


def _get_sqlite_connection():
    connection = sqlite3.connect(SQLITE_DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.executescript(SQLITE_SCHEMA)
    connection.commit()
    return connection

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'appointments_db'),
            charset='utf8mb4',
            use_unicode=True
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        print(f"Falling back to SQLite at: {SQLITE_DB_PATH}")
        try:
            return _get_sqlite_connection()
        except sqlite3.Error as sqlite_error:
            print(f"Error connecting to SQLite: {sqlite_error}")
            return None

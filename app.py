from flask import Flask, request, jsonify
from flask_cors import CORS
from config import get_db_connection
from mysql.connector import Error
from datetime import datetime, date, timedelta
import os
import sqlite3

app = Flask(__name__)
CORS(app)


def is_sqlite_connection(connection):
    return connection.__class__.__module__.startswith('sqlite3')


def create_cursor(connection, dictionary=False):
    if dictionary and not is_sqlite_connection(connection):
        return connection.cursor(dictionary=True)
    return connection.cursor()


def normalize_query(connection, query):
    if is_sqlite_connection(connection):
        return query.replace('%s', '?')
    return query


def execute_sql(cursor, connection, query, params=None):
    normalized_query = normalize_query(connection, query)
    if params is None:
        cursor.execute(normalized_query)
    else:
        cursor.execute(normalized_query, params)


def normalize_row(row):
    def normalize_value(value):
        if isinstance(value, timedelta):
            total_seconds = int(value.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        return value

    if row is None:
        return None
    if isinstance(row, dict):
        return {key: normalize_value(value) for key, value in row.items()}
    if isinstance(row, sqlite3.Row):
        return {key: normalize_value(row[key]) for key in row.keys()}
    return row


def normalize_rows(rows):
    return [normalize_row(row) for row in rows]


def normalize_fee_value(raw_fee):
    """Normalize fee text to a DB-safe ASCII value like '800'."""
    if raw_fee is None:
        return ""

    fee_text = str(raw_fee).strip()
    digits = "".join(ch for ch in fee_text if ch.isdigit())
    if digits:
        return digits

    # Fallback for unusual fee formats: keep ASCII only.
    return fee_text.encode('ascii', 'ignore').decode().strip()

# ─── APPOINTMENTS ────────────────────────────────────────────────────────────

@app.route('/api/appointments', methods=['POST'])
def book_appointment():
    data = request.json
    print("DEBUG: Received appointment data:", data)
    
    # Validate required fields
    required_fields = ['doctor_id', 'doctor_name', 'specialty', 'hospital', 'fee',
                      'patient_name', 'patient_email', 'patient_phone',
                      'appointment_date', 'appointment_time']
    missing_fields = [f for f in required_fields if f not in data or data[f] is None]
    
    if missing_fields:
        error_msg = f"Missing required fields: {', '.join(missing_fields)}"
        print(f"DEBUG: {error_msg}")
        return jsonify({'error': error_msg}), 400
    
    connection = get_db_connection()
    
    if not connection:
        print("DEBUG: Database connection failed")
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection)
        normalized_fee = normalize_fee_value(data.get('fee'))
        query = """INSERT INTO appointments 
                   (doctor_id, doctor_name, specialty, hospital, fee, 
                    patient_name, patient_email, patient_phone, 
                    appointment_date, appointment_time, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'booked')"""
        
        values = (
            data['doctor_id'], data['doctor_name'], data['specialty'],
            data['hospital'], normalized_fee, data['patient_name'],
            data['patient_email'], data['patient_phone'],
            data['appointment_date'], data['appointment_time']
        )
        
        print(f"DEBUG: Executing query with values: {values}")
        execute_sql(cursor, connection, query, values)
        connection.commit()
        print(f"DEBUG: Appointment inserted with ID: {cursor.lastrowid}")
        return jsonify({
            'success': True, 
            'id': cursor.lastrowid,
            'message': 'Appointment booked successfully'
        }), 201
    except (Error, sqlite3.Error) as e:
        print(f"DEBUG: Database error: {str(e)}")
        connection.rollback()
        return jsonify({'error': f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection, dictionary=True)
        execute_sql(cursor, connection, "SELECT * FROM appointments ORDER BY appointment_date DESC")
        appointments = cursor.fetchall()
        return jsonify(normalize_rows(appointments)), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/appointments/<int:id>', methods=['GET'])
def get_appointment(id):
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection, dictionary=True)
        execute_sql(cursor, connection, "SELECT * FROM appointments WHERE id=%s", (id,))
        appointment = cursor.fetchone()
        appointment = normalize_row(appointment)
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        return jsonify(appointment), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/appointments/<int:id>', methods=['DELETE'])
def cancel_appointment(id):
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection)
        execute_sql(cursor, connection, "UPDATE appointments SET status='cancelled' WHERE id=%s", (id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Appointment not found'}), 404
        
        return jsonify({'success': True, 'message': 'Appointment cancelled'}), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ─── RESTAURANT RESERVATIONS ─────────────────────────────────────────────────

@app.route('/api/reservations', methods=['POST'])
def book_reservation():
    data = request.json
    print("DEBUG: Received reservation data:", data)
    
    # Validate required fields
    required_fields = ['restaurant_id', 'restaurant_name', 'cuisine',
                      'customer_name', 'customer_email', 'customer_phone',
                      'reservation_date', 'reservation_time', 'party_size']
    missing_fields = [f for f in required_fields if f not in data or data[f] is None]
    
    if missing_fields:
        error_msg = f"Missing required fields: {', '.join(missing_fields)}"
        print(f"DEBUG: {error_msg}")
        return jsonify({'error': error_msg}), 400
    
    connection = get_db_connection()
    
    if not connection:
        print("DEBUG: Database connection failed")
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection)
        query = """INSERT INTO restaurant_reservations 
                   (restaurant_id, restaurant_name, cuisine, customer_name, 
                    customer_email, customer_phone, reservation_date, 
                    reservation_time, party_size, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'confirmed')"""
        
        values = (
            data['restaurant_id'], data['restaurant_name'], data['cuisine'],
            data['customer_name'], data['customer_email'], data['customer_phone'],
            data['reservation_date'], data['reservation_time'], data['party_size']
        )
        
        print(f"DEBUG: Executing query with values: {values}")
        execute_sql(cursor, connection, query, values)
        connection.commit()
        print(f"DEBUG: Reservation inserted with ID: {cursor.lastrowid}")
        return jsonify({
            'success': True,
            'id': cursor.lastrowid,
            'message': 'Reservation booked successfully'
        }), 201
    except (Error, sqlite3.Error) as e:
        print(f"DEBUG: Database error: {str(e)}")
        connection.rollback()
        return jsonify({'error': f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/reservations', methods=['GET'])
def get_reservations():
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection, dictionary=True)
        execute_sql(cursor, connection, "SELECT * FROM restaurant_reservations ORDER BY reservation_date DESC")
        reservations = cursor.fetchall()
        return jsonify(normalize_rows(reservations)), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/reservations/<int:id>', methods=['GET'])
def get_reservation(id):
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection, dictionary=True)
        execute_sql(cursor, connection, "SELECT * FROM restaurant_reservations WHERE id=%s", (id,))
        reservation = cursor.fetchone()
        reservation = normalize_row(reservation)
        
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        return jsonify(reservation), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/reservations/<int:id>', methods=['DELETE'])
def cancel_reservation(id):
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection)
        execute_sql(cursor, connection, "UPDATE restaurant_reservations SET status='cancelled' WHERE id=%s", (id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Reservation not found'}), 404
        
        return jsonify({'success': True, 'message': 'Reservation cancelled'}), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ─── HEALTH CHECK ────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check API and database health"""
    connection = get_db_connection()
    
    if not connection:
        return jsonify({
            'status': 'error',
            'message': 'Database connection failed',
            'database': 'offline'
        }), 500
    
    try:
        cursor = create_cursor(connection, dictionary=True)
        execute_sql(cursor, connection, "SELECT COUNT(*) as count FROM appointments")
        result = cursor.fetchone()
        result = normalize_row(result)
        appointment_count = result['count'] if result else 0
        
        execute_sql(cursor, connection, "SELECT COUNT(*) as count FROM restaurant_reservations")
        reservation_result = cursor.fetchone()
        reservation_result = normalize_row(reservation_result)
        reservation_count = reservation_result['count'] if reservation_result else 0
        
        return jsonify({
            'status': 'ok',
            'database': 'online',
            'appointments_count': appointment_count,
            'reservations_count': reservation_count,
            'message': 'API is running and database is connected'
        }), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({
            'status': 'error',
            'message': f'Database query failed: {str(e)}',
            'database': 'error'
        }), 500
    finally:
        cursor.close()
        connection.close()

# ─── CLEANUP EXPIRED BOOKINGS ─────────────────────────────────────────────────

@app.route('/api/cleanup-expired', methods=['POST'])
def cleanup_expired():
    """Delete appointments and reservations with dates in the past"""
    connection = get_db_connection()
    
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = create_cursor(connection)
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Delete expired appointments
        execute_sql(cursor, connection, 
                   "DELETE FROM appointments WHERE appointment_date < %s", (today,))
        deleted_appts = cursor.rowcount
        
        # Delete expired reservations
        execute_sql(cursor, connection,
                   "DELETE FROM restaurant_reservations WHERE reservation_date < %s", (today,))
        deleted_ress = cursor.rowcount
        
        connection.commit()
        
        return jsonify({
            'success': True,
            'deleted_appointments': deleted_appts,
            'deleted_reservations': deleted_ress,
            'message': f'Cleaned up {deleted_appts + deleted_ress} expired bookings'
        }), 200
    except (Error, sqlite3.Error) as e:
        return jsonify({'error': f'Cleanup failed: {str(e)}'}), 500
    finally:
        cursor.close()
        connection.close()

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

if __name__ == '__main__':
    app.run(
        debug=True,
        port=int(os.getenv('PORT', 5000)),
        host=os.getenv('FLASK_HOST', '0.0.0.0')
    )

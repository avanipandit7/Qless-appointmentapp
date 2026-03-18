from flask import Flask, request, jsonify
from flask_cors import CORS
from config import get_db_connection
from mysql.connector import Error
from datetime import datetime

app = Flask(__name__)
CORS(app)

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
        cursor = connection.cursor()
        query = """INSERT INTO appointments 
                   (doctor_id, doctor_name, specialty, hospital, fee, 
                    patient_name, patient_email, patient_phone, 
                    appointment_date, appointment_time, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'booked')"""
        
        values = (
            data['doctor_id'], data['doctor_name'], data['specialty'],
            data['hospital'], data['fee'], data['patient_name'],
            data['patient_email'], data['patient_phone'],
            data['appointment_date'], data['appointment_time']
        )
        
        print(f"DEBUG: Executing query with values: {values}")
        cursor.execute(query, values)
        connection.commit()
        print(f"DEBUG: Appointment inserted with ID: {cursor.lastrowid}")
        return jsonify({
            'success': True, 
            'id': cursor.lastrowid,
            'message': 'Appointment booked successfully'
        }), 201
    except Error as e:
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
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM appointments ORDER BY appointment_date DESC")
        appointments = cursor.fetchall()
        return jsonify(appointments), 200
    except Error as e:
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
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM appointments WHERE id=%s", (id,))
        appointment = cursor.fetchone()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        return jsonify(appointment), 200
    except Error as e:
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
        cursor = connection.cursor()
        cursor.execute("UPDATE appointments SET status='cancelled' WHERE id=%s", (id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Appointment not found'}), 404
        
        return jsonify({'success': True, 'message': 'Appointment cancelled'}), 200
    except Error as e:
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
        cursor = connection.cursor()
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
        cursor.execute(query, values)
        connection.commit()
        print(f"DEBUG: Reservation inserted with ID: {cursor.lastrowid}")
        return jsonify({
            'success': True,
            'id': cursor.lastrowid,
            'message': 'Reservation booked successfully'
        }), 201
    except Error as e:
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
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM restaurant_reservations ORDER BY reservation_date DESC")
        reservations = cursor.fetchall()
        return jsonify(reservations), 200
    except Error as e:
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
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM restaurant_reservations WHERE id=%s", (id,))
        reservation = cursor.fetchone()
        
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        return jsonify(reservation), 200
    except Error as e:
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
        cursor = connection.cursor()
        cursor.execute("UPDATE restaurant_reservations SET status='cancelled' WHERE id=%s", (id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Reservation not found'}), 404
        
        return jsonify({'success': True, 'message': 'Reservation cancelled'}), 200
    except Error as e:
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
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as count FROM appointments")
        result = cursor.fetchone()
        appointment_count = result['count'] if result else 0
        
        cursor.execute("SELECT COUNT(*) as count FROM restaurant_reservations")
        reservation_result = cursor.fetchone()
        reservation_count = reservation_result['count'] if reservation_result else 0
        
        return jsonify({
            'status': 'ok',
            'database': 'online',
            'appointments_count': appointment_count,
            'reservations_count': reservation_count,
            'message': 'API is running and database is connected'
        }), 200
    except Error as e:
        return jsonify({
            'status': 'error',
            'message': f'Database query failed: {str(e)}',
            'database': 'error'
        }), 500
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
    app.run(debug=True, port=5000, host='localhost')

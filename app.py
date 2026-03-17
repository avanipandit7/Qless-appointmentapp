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
    connection = get_db_connection()
    
    if not connection:
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
        
        cursor.execute(query, values)
        connection.commit()
        return jsonify({
            'success': True, 
            'id': cursor.lastrowid,
            'message': 'Appointment booked successfully'
        }), 201
    except Error as e:
        return jsonify({'error': str(e)}), 500
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
    connection = get_db_connection()
    
    if not connection:
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
        
        cursor.execute(query, values)
        connection.commit()
        return jsonify({
            'success': True,
            'id': cursor.lastrowid,
            'message': 'Reservation booked successfully'
        }), 201
    except Error as e:
        return jsonify({'error': str(e)}), 500
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
    connection = get_db_connection()
    
    if connection:
        connection.close()
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    else:
        return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 500

# ─── ERROR HANDLERS ──────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='localhost')

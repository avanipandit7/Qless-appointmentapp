import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection details
config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# SQL to create database and tables
CREATE_DATABASE = "CREATE DATABASE IF NOT EXISTS appointments_db"

CREATE_APPOINTMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    doctor_name VARCHAR(255),
    specialty VARCHAR(100),
    hospital VARCHAR(255),
    fee VARCHAR(50),
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255),
    patient_phone VARCHAR(20),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('booked', 'completed', 'cancelled') DEFAULT 'booked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_RESTAURANTS_TABLE = """
CREATE TABLE IF NOT EXISTS restaurant_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    restaurant_name VARCHAR(255),
    cuisine VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INT,
    status ENUM('confirmed', 'completed', 'cancelled') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

def setup_database():
    try:
        # Connect to MySQL (without selecting database)
        print("Connecting to MySQL...")
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # Create database
        print("Creating database 'appointments_db'...")
        cursor.execute(CREATE_DATABASE)
        
        # Select the database
        cursor.execute("USE appointments_db")
        
        # Create appointments table
        print("Creating 'appointments' table...")
        cursor.execute(CREATE_APPOINTMENTS_TABLE)
        
        # Create restaurant_reservations table
        print("Creating 'restaurant_reservations' table...")
        cursor.execute(CREATE_RESTAURANTS_TABLE)
        
        connection.commit()
        print("\n✓ Database setup completed successfully!")
        print("Database: appointments_db")
        print("Tables: appointments, restaurant_reservations")
        
        cursor.close()
        connection.close()
        
    except Error as e:
        print(f"✗ Error: {e}")
        print("\nTroubleshooting:")
        print("- Check if MySQL is running (search 'Services' in Windows)")
        print("- Update DB_USER and DB_PASSWORD in .env if needed")
        print("- Default is usually: user='root', password=''")

if __name__ == "__main__":
    setup_database()

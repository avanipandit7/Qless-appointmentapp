-- Create Database
CREATE DATABASE IF NOT EXISTS appointments_db;
USE appointments_db;

-- Appointments Table
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
);

-- Restaurant Reservations Table
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
);

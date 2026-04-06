# Appointment Booking Application

A full-stack web application for booking doctor appointments. Built with React (frontend) and Flask (backend), connected to a MySQL database.

## Overview

This appointment booking system allows users to:
- Browse available doctors and their specialties
- View doctor details (hospital, fee, availability)
- Book appointments with their preferred date and time
- Store appointment details (patient info, appointment confirmation)

## Tech Stack

- **Frontend**: React 19, React Scripts
- **Backend**: Flask, Python
- **Database**: MySQL
- **API Communication**: REST API with CORS support

## Project Structure

```
appointment-app/
├── src/                    # React frontend source code
│   ├── App.js             # Main React component
│   ├── App.css            # Styling
│   ├── index.js           # App entry point
│   └── ...
├── backend/               # Python Flask backend
│   ├── app.py             # Flask API endpoints
│   ├── config.py          # Database configuration
│   ├── schema.sql         # Database schema
│   ├── setup_db.py        # Database initialization script
│   ├── requirements.txt   # Python dependencies
│   └── test_api.py        # API tests
├── public/                # Static HTML files
└── package.json           # Node.js dependencies
```

## Prerequisites

- Node.js 14+ and npm
- Python 3.7+
- MySQL Server

## Installation

### Frontend Setup

1. Install Node.js dependencies:
```bash
npm install
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a Python virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Set up the database:
   - Ensure MySQL is running
   - Update database credentials in `config.py`
   - Run the setup script:
   ```bash
   python setup_db.py
   ```

## Running the Application

### Start the Backend Server

```bash
cd backend
python app.py
```

The Flask API will run on `http://localhost:5000`

### Start the Frontend Development Server

```bash
npm start
```

The React app will open at `http://localhost:3000`

If you are deploying the frontend separately from the backend, set `REACT_APP_API_URL` to your backend base URL before building. For example:

```bash
REACT_APP_API_URL=https://your-backend.example.com/api npm run build
```

This app no longer depends on the CRA `proxy` setting, so the backend URL must be explicit in deployed environments.

## Key Features

- **API Endpoints**:
  - `POST /api/appointments` - Book a new appointment
  - `GET /api/appointments` - Retrieve appointment details

- **User-Friendly Interface**: Simple and intuitive UI for browsing and booking appointments

- **Data Validation**: Date and time formatting for database compatibility

- **Error Handling**: Comprehensive error handling on both frontend and backend

## Available npm Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (one-way operation)

## Database Schema

The application uses the following tables:
- **appointments** - Stores booking information (doctor details, patient info, appointment date/time)

See `backend/schema.sql` for complete schema details.

## API Documentation

### Book Appointment
**POST** `/api/appointments`

Request body:
```json
{
  "doctor_id": 1,
  "doctor_name": "Dr. Smith",
  "specialty": "Cardiology",
  "hospital": "City Hospital",
  "fee": 100,
  "patient_name": "John Doe",
  "patient_email": "john@example.com",
  "patient_phone": "1234567890",
  "appointment_date": "2026-03-20",
  "appointment_time": "10:00:00"
}
```

Response:
```json
{
  "success": true,
  "id": 1,
  "message": "Appointment booked successfully"
}
```

## Testing

Run the test suite:
```bash
npm test
```

To test the API endpoints:
```bash
cd backend
python test_api.py
```

## Troubleshooting

- **Database Connection Error**: Verify MySQL is running and credentials in `config.py` are correct
- **CORS Issues**: Ensure Flask CORS is enabled (already configured in `app.py`)
- **Port Already in Use**: Change the port in backend/app.py or frontend configuration

## Future Enhancements

- User authentication and login
- Email notifications for appointments
- Doctor availability calendar view
- Appointment cancellation/rescheduling
- Payment integration
- Admin dashboard for managing doctors and appointments

## License

This project is private and for internal use.

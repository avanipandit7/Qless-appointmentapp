import requests
import json

API_URL = "http://localhost:5000/api"

# Test 1: Health Check
print("1. Testing health check...")
try:
    response = requests.get(f"{API_URL}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
except Exception as e:
    print(f"   Error: {e}\n")

# Test 2: Create a test appointment
print("2. Creating test appointment...")
appointment_data = {
    "doctor_id": 1,
    "doctor_name": "Dr. Priya Sharma",
    "specialty": "Cardiologist",
    "hospital": "Sancheti Hospital",
    "fee": "₹800",
    "patient_name": "Test Patient",
    "patient_email": "test@example.com",
    "patient_phone": "9876543210",
    "appointment_date": "2026-03-20",
    "appointment_time": "10:00"
}
try:
    response = requests.post(f"{API_URL}/appointments", json=appointment_data)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
except Exception as e:
    print(f"   Error: {e}\n")

# Test 3: Create a test reservation
print("3. Creating test reservation...")
reservation_data = {
    "restaurant_id": 1,
    "restaurant_name": "Babylon",
    "cuisine": "Continental",
    "customer_name": "Test Customer",
    "customer_email": "customer@example.com",
    "customer_phone": "9876543210",
    "reservation_date": "2026-03-20",
    "reservation_time": "19:00",
    "party_size": 4
}
try:
    response = requests.post(f"{API_URL}/reservations", json=reservation_data)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
except Exception as e:
    print(f"   Error: {e}\n")

# Test 4: Get all appointments
print("4. Getting all appointments...")
try:
    response = requests.get(f"{API_URL}/appointments")
    print(f"   Status: {response.status_code}")
    print(f"   Count: {len(response.json())}")
    print(f"   Data: {json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"   Error: {e}\n")

# Test 5: Get all reservations
print("5. Getting all reservations...")
try:
    response = requests.get(f"{API_URL}/reservations")
    print(f"   Status: {response.status_code}")
    print(f"   Count: {len(response.json())}")
    print(f"   Data: {json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"   Error: {e}\n")

print("✓ Testing complete!")

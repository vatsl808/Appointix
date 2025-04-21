from flask import Flask, request, jsonify, send_from_directory
# Removed flask_sqlalchemy import
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId # Import ObjectId
import jwt
from datetime import datetime, timedelta
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import uuid

# Initialize Flask app
app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))

# Configure Database & Uploads
UPLOAD_FOLDER = os.path.join(basedir, 'uploads', 'profile_pics')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = 

# MongoDB Configuration
app.config['MONGO_URI'] = 'mongodb://localhost:27017/'
app.config['MONGO_DBNAME'] = 'appointix'
app.config['SECRET_KEY'] = 'awt_project_secret_key123'

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize MongoDB Client
client = MongoClient(app.config['MONGO_URI'])
db = client[app.config['MONGO_DBNAME']] # Get database object

# Allow API requests
CORS(app, resources={
    r"/api/*": {"origins": "http://localhost:3000"},
    r"/uploads/*": {"origins": "http://localhost:3000"}
})


def get_user_from_token():
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(" ")[1]
    if not token:
        return None, {"error": "Authorization token is missing!"}, 401
    try:
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = db.users.find_one({'_id': ObjectId(payload['user_id'])}
        )

        if not user:
            return None, {"error": "User not found for token"}, 401

        user['token_user_type'] = payload.get('user_type')

        # attach doctor_id if user is a doctor
        if user.get('user_type') == 'doctor':
            doctor_profile = db.doctors.find_one({'user_id': user['_id']})
            user['doctor_id'] = str(doctor_profile['_id']) if doctor_profile else None
        else:
            user['doctor_id'] = None

        
        user['_id'] = str(user['_id'])

        return user, None, None

    except Exception as e:
        app.logger.error(f"Token processing error: {e}") # Log the error
        return None, {"error": f'Token processing error: {e}'}, 401


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function for availability check (backend version) - Moved here


def check_backend_availability(doctor_id_str, appt_date_str, appt_time_str):
    """Checks if a doctor is available at a specific date and time, including conflict checks."""
    try:
        doctor_oid = ObjectId(doctor_id_str)
    except Exception: # Catches InvalidId from bson.objectid
        app.logger.error(f"Invalid doctor_id format for availability check: {doctor_id_str}")
        return False # Invalid ID format

    doctor = db.doctors.find_one({'_id': doctor_oid})
    availability_schedule = doctor.get('availability') if doctor else None

    if not doctor or not availability_schedule:
        app.logger.warning(f"Availability check: Doctor {doctor_id_str} not found or has no availability schedule.")
        return False

    try:
        appt_datetime = datetime.strptime(f"{appt_date_str} {appt_time_str}", "%Y-%m-%d %H:%M")
        day_of_week = appt_datetime.strftime('%A') # e.g., 'Monday'
        day_schedule = availability_schedule.get(day_of_week)

        if not day_schedule or not day_schedule.get('isAvailable'):
            # Not available on this day or schedule missing for the day
            return False

        # Check time range based on stored start/end times
        is_within_time = day_schedule.get('startTime', '') <= appt_time_str < day_schedule.get('endTime', '')
        if not is_within_time:
            # Requested time is outside the doctor's working hours for that day
            return False

        # --- Check for existing appointments blocking this slot ---
        # Convert appointment datetime to check range.
        # MongoDB stores datetime objects natively (BSON Date).
        appt_start_time = appt_datetime
        # Define the end of the potential appointment slot. Adjust duration as needed (e.g., 1 hour).
        appt_end_time = appt_datetime + timedelta(hours=1)

        # Query for appointments that overlap with the requested slot.
        # This requires 'appointment_datetime' to be stored as ISODate in MongoDB.
        conflicting_appointment = db.appointments.find_one({
            'doctor_id': doctor_oid, # Match the doctor
            'status': 'upcoming',    # Only check against active appointments
            'appointment_datetime': {
                # Appointment starts before the requested slot ends AND
                # Appointment ends after the requested slot starts
                # This covers all overlap scenarios.
                '$lt': appt_end_time,
                '$gte': appt_start_time
            }
        })

        if conflicting_appointment:
            # A conflicting appointment exists
            app.logger.info(f"Availability check failed: Conflicting appointment found for Dr {doctor_id_str} at {appt_date_str} {appt_time_str}")
            return False

        # If we reach here, the doctor is generally available and the specific slot is free
        return True

    except ValueError:
        # Error parsing the provided date/time strings
        app.logger.error(f"Error parsing date/time for availability check: {appt_date_str} {appt_time_str}")
        return False
    except Exception as e:
        # Catch other potential errors during the check
        app.logger.error(f"Error checking availability for doctor {doctor_id_str}: {e}")
        return False

# --- API Endpoints ---


@app.route('/')
def index(): return "Appointix Backend is Running!"

# --- Doctor Endpoints ---


@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    # Public endpoint - returns limited info from MongoDB
    try:
        # Fetch only necessary fields from the doctors collection
        doctors_cursor = db.doctors.find(
            {}, # Empty filter to get all doctors
            {
                "_id": 1, # Include the ID
                "name": 1,
                "specialization": 1,
                "profile_picture_url": 1,
                "availability": 1 # Include availability schedule
            }
        )

        doctor_list = []
        for doc in doctors_cursor:
            doctor_list.append({
                # Convert ObjectId to string for JSON serialization
                "id": str(doc['_id']),
                "name": doc.get('name'),
                "specialization": doc.get('specialization'),
                "profilePictureUrl": doc.get('profile_picture_url'),
                # Availability should already be stored as an object/dict
                "availability": doc.get('availability', {})
            })

        return jsonify(doctor_list)
    except Exception as e:
        app.logger.error(f"Failed to fetch doctors: {e}")
        return jsonify({"error": f"Failed to fetch doctors: {e}"}), 500


# Use string for ObjectId
@app.route('/api/doctors/<string:doctor_id_str>', methods=['GET'])
def get_doctor_details(doctor_id_str):
    """Returns details for a specific doctor. Requires authentication."""
    # 1. Authentication Check
    # requesting_user is now a dictionary if successful
    requesting_user, error, status_code = get_user_from_token()
    if error:
        return jsonify(error), status_code

    # Check if user object exists (should be caught by get_user_from_token, but good practice)
    if not requesting_user:
         return jsonify({"error": "Authentication required"}), 401

    # --- Authorization Logic (using dictionary access) ---
    requesting_user_type = requesting_user.get('token_user_type') # Use the type from the token
    requesting_user_id = requesting_user.get('_id') # User's own ID (string)
    requesting_doctor_id = requesting_user.get('doctor_id') # Doctor's profile ID (string), if applicable

    if requesting_user_type == 'doctor':
        # Doctors can only access their own profile
        if requesting_doctor_id is None:
             # This indicates an issue - a doctor user should have a doctor_id in their token context
             app.logger.error(f"Doctor user {requesting_user_id} is missing doctor_id in token context.")
             return jsonify({"error": "Internal server error: Doctor profile context missing."}), 500
        # Compare the requested doctor ID string with the one from the token
        if requesting_doctor_id != doctor_id_str:
            return jsonify({"error": "Forbidden: Doctors can only access their own profile."}), 403
        # If doctor is accessing their own profile, proceed.
    elif requesting_user_type == 'patient':
        # Patients are allowed to fetch any doctor's details for booking purposes.
        pass # Proceed
    else:
        # Block any other user type or if type is missing
        app.logger.warning(f"Unauthorized access attempt to doctor details by user {requesting_user_id} with type {requesting_user_type}")
        return jsonify({"error": "Unauthorized user type."}), 403
    # --- END Authorization Logic ---

    # 2. Fetch Doctor Data from MongoDB
    try:
        try:
            doctor_oid = ObjectId(doctor_id_str)
        except Exception: # bson.errors.InvalidId
            return jsonify({"error": "Invalid doctor ID format"}), 400

        # Fetch the doctor document by its ObjectId
        doctor = db.doctors.find_one({'_id': doctor_oid})

        if not doctor:
            return jsonify({"error": "Doctor not found"}), 404

        # Prepare the response data from the document
        doctor_details = {
            "id": str(doctor['_id']), # Convert ObjectId to string
            # user_id should be stored as ObjectId, convert to string
            "user_id": str(doctor.get('user_id')),
            "name": doctor.get('name'),
            "specialization": doctor.get('specialization'),
            "email": doctor.get('email'),
            "phone": doctor.get('phone'),
            "bio": doctor.get('bio'),
            "profilePictureUrl": doctor.get('profile_picture_url'),
            # Availability should be stored as an object
            "availability": doctor.get('availability', {})
        }
        return jsonify(doctor_details)
    except Exception as e:
        app.logger.error(f"Failed to fetch doctor details for {doctor_id_str}: {e}")
        return jsonify({"error": f"Failed to fetch doctor details: {e}"}), 500


@app.route('/api/doctors/me/availability', methods=['PUT'])
def update_doctor_availability():
    # doctor_user is a dictionary
    doctor_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type from the dictionary
    if doctor_user.get('token_user_type') != 'doctor':
        return jsonify({"error": "Unauthorized: Only doctors can update availability."}), 403

    # Get the doctor's profile ID (string) from the token context
    doctor_id_str = doctor_user.get('doctor_id')
    if not doctor_id_str:
        app.logger.error(f"Doctor user {doctor_user.get('_id')} missing doctor_id in token context during availability update.")
        return jsonify({"error": "Internal server error: Doctor context missing."}), 500

    new_availability = request.get_json()
    # Basic validation for the availability data structure
    if not new_availability or not isinstance(new_availability, dict):
        return jsonify({"error": "Invalid availability data format. Expected a JSON object."}), 400
    # TODO: Add more specific validation for the structure of the availability object (days, times, etc.)

    try:
        doctor_oid = ObjectId(doctor_id_str)
    except Exception:
        return jsonify({"error": "Invalid doctor ID format in token."}), 500 # Should not happen if token generation is correct

    try:
        # --- MongoDB Update ---
        update_result = db.doctors.update_one(
            {'_id': doctor_oid}, # Filter by the doctor's ObjectId
            {'$set': {'availability': new_availability}} # Set the new availability object
        )

        if update_result.matched_count == 0:
            # This means the doctor_oid from the token didn't match any document
            app.logger.error(f"Attempted to update availability for non-existent doctor ID: {doctor_id_str}")
            return jsonify({"error": "Doctor profile not found for update."}), 404
        elif update_result.modified_count == 0 and update_result.matched_count == 1:
             # Found the doctor, but the data was the same as existing data
             return jsonify({"message": "Availability is already up to date."}), 200
        else:
            # Successfully updated
            return jsonify({"message": "Availability updated successfully."}), 200

    except Exception as e:
        app.logger.error(f"Failed to update availability for doctor {doctor_id_str}: {e}")
        # No db.session.rollback() needed with PyMongo for single operations
        return jsonify({"error": f"Failed to update availability: {e}"}), 500


@app.route('/api/doctors/me/profile', methods=['PUT'])
def update_doctor_profile():
    # doctor_user is a dictionary
    doctor_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type
    if doctor_user.get('token_user_type') != 'doctor':
        return jsonify({"error": "Unauthorized: Only doctors can update profile."}), 403

    # Get doctor's profile ID string from token context
    doctor_id_str = doctor_user.get('doctor_id')
    if not doctor_id_str:
        app.logger.error(f"Doctor user {doctor_user.get('_id')} missing doctor_id in token context during profile update.")
        return jsonify({"error": "Internal server error: Doctor context missing."}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing profile data in request body."}), 400

    # --- Prepare MongoDB Update ---
    update_fields = {}
    if 'phone' in data:
        update_fields['phone'] = data['phone']
    if 'bio' in data:
        update_fields['bio'] = data['bio']

    # Only proceed if there's something to update
    if not update_fields:
        return jsonify({"message": "No profile fields provided for update."}), 200 # Or 400 depending on desired behavior

    try:
        doctor_oid = ObjectId(doctor_id_str)
    except Exception:
        return jsonify({"error": "Invalid doctor ID format in token."}), 500

    try:
        # --- MongoDB Update ---
        update_result = db.doctors.update_one(
            {'_id': doctor_oid}, # Filter by doctor's ObjectId
            {'$set': update_fields} # Set the fields provided
        )

        if update_result.matched_count == 0:
            app.logger.error(f"Attempted to update profile for non-existent doctor ID: {doctor_id_str}")
            return jsonify({"error": "Doctor profile not found for update."}), 404
        elif update_result.modified_count == 0 and update_result.matched_count == 1:
             # Found the doctor, but the data was the same as existing data
             return jsonify({"message": "Profile data is already up to date."}), 200
        else:
            # Successfully updated, return the updated fields
            # Fetch the updated document to return the current state (optional but good practice)
            updated_profile = db.doctors.find_one(
                {'_id': doctor_oid},
                {'phone': 1, 'bio': 1} # Project only the updated fields
            )
            return jsonify({
                "message": "Profile updated successfully.",
                # Return only the fields that could have been updated
                "profile": {
                    "phone": updated_profile.get('phone'),
                    "bio": updated_profile.get('bio')
                }
             }), 200

    except Exception as e:
        app.logger.error(f"Failed to update profile for doctor {doctor_id_str}: {e}")
        return jsonify({"error": f"Failed to update profile: {e}"}), 500


@app.route('/api/doctors/me/profile-picture', methods=['POST'])
def upload_profile_picture():
    # doctor_user is a dictionary
    doctor_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type
    if doctor_user.get('token_user_type') != 'doctor':
        return jsonify({"error": "Unauthorized: Only doctors can upload profile pictures."}), 403

    # Get doctor's profile ID string from token context
    doctor_id_str = doctor_user.get('doctor_id')
    if not doctor_id_str:
        app.logger.error(f"Doctor user {doctor_user.get('_id')} missing doctor_id in token context during picture upload.")
        return jsonify({"error": "Internal server error: Doctor context missing."}), 500

    # --- File Handling ---
    if 'profilePic' not in request.files:
        return jsonify({"error": "No profile picture file part ('profilePic') in request."}), 400
    file = request.files['profilePic']
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400

    if file and allowed_file(file.filename):
        # Generate unique filename
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        new_file_url = f"/uploads/profile_pics/{filename}" # URL path for frontend

        try:
            doctor_oid = ObjectId(doctor_id_str)
        except Exception:
            return jsonify({"error": "Invalid doctor ID format in token."}), 500

        old_file_url = None
        try:
            # --- Fetch old URL before saving new file ---
            doctor_profile = db.doctors.find_one({'_id': doctor_oid}, {'profile_picture_url': 1})
            if not doctor_profile:
                 # Should not happen if token is valid, but check anyway
                 return jsonify({"error": "Doctor profile not found."}), 404
            old_file_url = doctor_profile.get('profile_picture_url')

            # --- Save the new file ---
            file.save(filepath)

            # --- Update MongoDB ---
            update_result = db.doctors.update_one(
                {'_id': doctor_oid},
                {'$set': {'profile_picture_url': new_file_url}}
            )

            if update_result.matched_count == 0:
                # Should not happen if find_one succeeded, but good to check
                app.logger.error(f"Failed to update profile picture URL for doctor {doctor_id_str} after saving file.")
                # Attempt to delete the newly saved file if DB update failed
                try: os.remove(filepath)
                except OSError as remove_error: app.logger.error(f"Failed to remove orphaned profile picture {filepath}: {remove_error}")
                return jsonify({"error": "Failed to update profile picture reference."}), 500

            # --- Attempt to delete old file (if it existed) ---
            if old_file_url:
                try:
                    # Construct full path from URL (assuming URL structure matches file storage)
                    old_filename = os.path.basename(old_file_url)
                    old_filepath = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
                    if os.path.exists(old_filepath):
                        os.remove(old_filepath)
                        app.logger.info(f"Successfully deleted old profile picture: {old_filepath}")
                except Exception as delete_error:
                    # Log error but don't fail the request, as the main goal (upload) succeeded
                    app.logger.error(f"Failed to delete old profile picture {old_file_url}: {delete_error}")

            return jsonify({"message": "Profile picture updated", "profilePictureUrl": new_file_url}), 200

        except Exception as e:
            app.logger.error(f"Failed during profile picture upload for doctor {doctor_id_str}: {e}")
            # No db.session.rollback() needed
            # Consider deleting the saved file if an error occurred during DB update or fetch
            if os.path.exists(filepath):
                 try: os.remove(filepath)
                 except OSError as remove_error: app.logger.error(f"Failed to remove partially uploaded file {filepath}: {remove_error}")
            return jsonify({"error": f"Failed to save or update picture: {e}"}), 500
    else:
        return jsonify({"error": "File type not allowed. Allowed types: " + ", ".join(ALLOWED_EXTENSIONS)}), 400

# --- Auth Endpoints ---


@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('userType') or not data.get('name'):
        return jsonify({"error": "Missing required fields"}), 400

    email = data['email']
    password = data['password']
    user_type = data['userType']
    name = data['name']
    specialization = data.get('specialization') # Optional

    # --- MongoDB Check ---
    if db.users.find_one({'email': email}):
        return jsonify({"error": "Email already registered"}), 409

    if user_type not in ['patient', 'doctor']:
        return jsonify({"error": "Invalid user type"}), 400
    if user_type == 'doctor' and not specialization:
        return jsonify({"error": "Specialization required for doctors"}), 400

    password_hash = generate_password_hash(password)

    # --- Create User Document ---
    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "user_type": user_type,
        "name": name,
        "created_at": datetime.utcnow() # Add a timestamp
    }

    try:
        # --- Insert User ---
        insert_result = db.users.insert_one(user_doc)
        new_user_id = insert_result.inserted_id # Get the ObjectId of the new user

        if user_type == 'doctor':
            # --- Create Doctor Document ---
            default_availability = {day: {"startTime": "", "endTime": "", "isAvailable": False} for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]}
            doctor_doc = {
                "user_id": new_user_id, # Link to the user document using ObjectId
                "name": name,
                "specialization": specialization,
                "email": email,
                # Initialize optional fields to None or handle if not provided
                "phone": data.get('phone'),
                "bio": data.get('bio'),
                "profile_picture_url": None,
                "availability": default_availability, # Store availability object directly
                "created_at": datetime.utcnow()
            }
            # --- Insert Doctor ---
            db.doctors.insert_one(doctor_doc)

        return jsonify({"message": f"{user_type.capitalize()} registered successfully!"}), 201

    except Exception as e:
        # Basic error handling, consider more specific exceptions like pymongo.errors.DuplicateKeyError
        app.logger.error(f"Registration failed: {e}")
        # If user insert succeeded but doctor failed, you might want to remove the user.
        # This requires more complex transaction logic or cleanup steps.
        # For simplicity, we are not implementing that rollback here.
        return jsonify({"error": f"Registration failed due to server error: {e}"}), 500


@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('userType'):
        return jsonify({"error": "Missing email, password, or userType"}), 400

    email = data['email']
    password = data['password']
    user_type_from_request = data['userType']

    # --- MongoDB Find User ---
    user = db.users.find_one({'email': email})

    # Check if user exists, password matches, and user type matches request
    if user and check_password_hash(user['password_hash'], password) and user['user_type'] == user_type_from_request:
        # --- Create JWT Token ---
        # Use string representation of ObjectId for user_id in token
        token_payload = {
            'user_id': str(user['_id']),
            'user_type': user['user_type'],
            'exp': datetime.utcnow() + timedelta(hours=24) # Token expiry
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

        response_data = {
            "message": "Login successful!",
            "token": token,
            "userType": user['user_type']
        }

        # If the user is a doctor, find their Doctor profile ID and add it
        if user['user_type'] == 'doctor':
            # --- MongoDB Find Doctor Profile ---
            # Find doctor profile linked by the user's ObjectId
            doctor_profile = db.doctors.find_one({'user_id': user['_id']})
            if doctor_profile:
                # Add the doctor's *own* ObjectId (as string) from the doctors collection
                response_data['doctorId'] = str(doctor_profile['_id'])
            else:
                # Log a warning if a doctor user logs in but has no doctor profile
                app.logger.warning(f"Doctor user {user['_id']} logged in but has no corresponding Doctor profile.")
                # Depending on requirements, you might want to return an error here
                # return jsonify({"error": "Doctor profile configuration error."}), 500

        return jsonify(response_data), 200
    else:
        # Authentication failed (user not found, wrong password, or wrong user type)
        return jsonify({"error": "Invalid email, password, or user type combination"}), 401

# --- Appointment Endpoints ---


@app.route('/api/appointments', methods=['POST'])
def book_appointment():
    # patient_user is a dictionary
    patient_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type from dictionary
    if patient_user.get('token_user_type') != 'patient':
        return jsonify({"error": "Unauthorized: Only patients can book appointments."}), 403

    data = request.get_json()
    if not data or not data.get('doctorId') or not data.get('date') or not data.get('time'):
        return jsonify({"error": "Missing required fields (doctorId, date, time)."}), 400

    doctor_id_str = data['doctorId']
    appt_date_str = data['date']
    appt_time_str = data['time']
    reason = data.get('reason', '')
    patient_id_str = patient_user.get('_id') # Get patient's ID string from token context

    # --- Log IDs before conversion for debugging ---
    app.logger.info(f"Attempting to book appointment. Doctor ID received: '{doctor_id_str}', Patient ID from token: '{patient_id_str}'")

    try:
        doctor_oid = ObjectId(doctor_id_str)
        patient_oid = ObjectId(patient_id_str)
    except Exception as e:
        # Log the specific error during conversion
        app.logger.error(f"ObjectId conversion failed. Doctor ID: '{doctor_id_str}', Patient ID: '{patient_id_str}'. Error: {e}")
        return jsonify({"error": "Invalid ID format for doctor or patient."}), 400

    # --- Fetch Doctor Info ---
    doctor = db.doctors.find_one({'_id': doctor_oid}, {'name': 1}) # Get only name
    if not doctor:
        return jsonify({"error": "Doctor not found."}), 404
    doctor_name = doctor.get('name', 'N/A') # Get doctor's name

    # --- Check Availability (using the updated function) ---
    if not check_backend_availability(doctor_id_str, appt_date_str, appt_time_str):
        # check_backend_availability now handles logging internally
        return jsonify({"error": f"Dr. {doctor_name} is not available at the selected time or the slot is booked."}), 409

    try:
        # --- Prepare Appointment Document ---
        appointment_datetime = datetime.strptime(f"{appt_date_str} {appt_time_str}", "%Y-%m-%d %H:%M")
        patient_name = patient_user.get('name', f"Patient {patient_id_str}") # Use name from user doc

        appointment_doc = {
            "doctor_id": doctor_oid, # Store as ObjectId
            "patient_id": patient_oid, # Store as ObjectId
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "appointment_datetime": appointment_datetime, # Store as BSON datetime
            "reason": reason,
            "status": "upcoming", # Default status
            "created_at": datetime.utcnow()
        }

        # --- Insert Appointment ---
        insert_result = db.appointments.insert_one(appointment_doc)
        new_appointment_id = insert_result.inserted_id

        # --- Prepare Response Data ---
        appointment_data = {
            "id": str(new_appointment_id), # Convert ObjectId to string
            "doctorId": str(appointment_doc['doctor_id']),
            "doctorName": appointment_doc['doctor_name'],
            "patientId": str(appointment_doc['patient_id']),
            "patientName": appointment_doc['patient_name'],
            "date": appointment_doc['appointment_datetime'].strftime('%Y-%m-%d'),
            "time": appointment_doc['appointment_datetime'].strftime('%H:%M'),
            "reason": appointment_doc['reason'],
            "status": appointment_doc['status']
        }
        return jsonify({"message": "Appointment booked successfully!", "appointment": appointment_data}), 201

    except ValueError:
         return jsonify({"error": "Invalid date or time format provided."}), 400
    except Exception as e:
        app.logger.error(f"Booking failed for patient {patient_id_str} with doctor {doctor_id_str}: {e}")
        # No db.session.rollback() needed
        return jsonify({"error": f"Booking failed due to server error: {e}"}), 500

@app.route('/api/appointments/patient', methods=['GET'])
def get_patient_appointments():
    # patient_user is a dictionary
    patient_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type from dictionary
    if patient_user.get('token_user_type') != 'patient':
        return jsonify({"error": "Unauthorized: Only patients can view their appointments."}), 403

    try:
        patient_id_str = patient_user.get('_id')
        patient_oid = ObjectId(patient_id_str)
    except Exception:
        app.logger.error(f"Invalid patient ID format in token: {patient_user.get('_id')}")
        return jsonify({"error": "Internal server error: Invalid user context."}), 500

    try:
        # --- MongoDB Query ---
        # Find appointments for the patient, sorted by date descending
        patient_appointments_cursor = db.appointments.find(
            {'patient_id': patient_oid} # Filter by patient's ObjectId
        ).sort('appointment_datetime', -1) # Sort descending (-1)

        appointments_list = []
        for appt in patient_appointments_cursor:
            appointments_list.append({
                "id": str(appt['_id']), # Convert appointment ObjectId
                "doctorId": str(appt.get('doctor_id')), # Convert doctor ObjectId
                "doctorName": appt.get('doctor_name'),
                # Patient ID is implicitly known, but can include if needed
                # "patientId": str(appt.get('patient_id')),
                "date": appt.get('appointment_datetime').strftime('%Y-%m-%d') if appt.get('appointment_datetime') else None,
                "time": appt.get('appointment_datetime').strftime('%H:%M') if appt.get('appointment_datetime') else None,
                "reason": appt.get('reason'),
                "status": appt.get('status')
            })

        return jsonify(appointments_list)
    except Exception as e:
        app.logger.error(f"Failed to fetch appointments for patient {patient_id_str}: {e}")
        return jsonify({"error": f"Failed to fetch appointments: {e}"}), 500

@app.route('/api/appointments/doctor', methods=['GET'])
def get_doctor_appointments():
    # doctor_user is a dictionary
    doctor_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type
    if doctor_user.get('token_user_type') != 'doctor':
        return jsonify({"error": "Unauthorized: Only doctors can view their appointments."}), 403

    # Get the doctor's profile ID (string) from the token context
    doctor_id_str = doctor_user.get('doctor_id')
    if not doctor_id_str:
        app.logger.error(f"Doctor user {doctor_user.get('_id')} missing doctor_id in token context when fetching appointments.")
        return jsonify({"error": "Internal server error: Doctor context missing."}), 500

    try:
        doctor_oid = ObjectId(doctor_id_str)
    except Exception:
        app.logger.error(f"Invalid doctor ID format in token: {doctor_id_str}")
        return jsonify({"error": "Internal server error: Invalid doctor context."}), 500

    try:
        # --- MongoDB Query ---
        # Find appointments for the doctor, sorted by date descending
        doctor_appointments_cursor = db.appointments.find(
            {'doctor_id': doctor_oid} # Filter by doctor's ObjectId
        ).sort('appointment_datetime', -1) # Sort descending

        appointments_list = []
        for appt in doctor_appointments_cursor:
            appointments_list.append({
                "id": str(appt['_id']), # Convert appointment ObjectId
                "patientId": str(appt.get('patient_id')), # Convert patient ObjectId
                "patientName": appt.get('patient_name'),
                # Doctor ID is implicitly known, but can include if needed
                # "doctorId": str(appt.get('doctor_id')),
                "date": appt.get('appointment_datetime').strftime('%Y-%m-%d') if appt.get('appointment_datetime') else None,
                "time": appt.get('appointment_datetime').strftime('%H:%M') if appt.get('appointment_datetime') else None,
                "reason": appt.get('reason'),
                "status": appt.get('status')
            })

        return jsonify(appointments_list)
    except Exception as e:
        app.logger.error(f"Failed to fetch appointments for doctor {doctor_id_str}: {e}")
        return jsonify({"error": f"Failed to fetch appointments: {e}"}), 500

# Use string for ObjectId
@app.route('/api/appointments/<string:appointment_id_str>', methods=['DELETE'])
def cancel_appointment(appointment_id_str):
    # patient_user is a dictionary
    patient_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type
    if patient_user.get('token_user_type') != 'patient':
        return jsonify({"error": "Unauthorized: Only patients can cancel their appointments."}), 403

    try:
        appointment_oid = ObjectId(appointment_id_str)
        patient_oid = ObjectId(patient_user.get('_id')) # Get patient ObjectId from token context
    except Exception:
        return jsonify({"error": "Invalid ID format for appointment or patient."}), 400

    try:
        # --- Fetch Appointment ---
        appointment = db.appointments.find_one({'_id': appointment_oid})

        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        # --- Authorization Check ---
        # Ensure the patient_id in the appointment matches the logged-in user
        if appointment.get('patient_id') != patient_oid:
            app.logger.warning(f"Forbidden attempt by patient {patient_oid} to cancel appointment {appointment_oid} belonging to {appointment.get('patient_id')}")
            return jsonify({"error": "Forbidden: You can only cancel your own appointments."}), 403

        # --- Status Check ---
        if appointment.get('status') != 'upcoming':
            return jsonify({"error": f"Cannot cancel appointment with status '{appointment.get('status')}'."}), 400

        # --- Update Status in MongoDB ---
        update_result = db.appointments.update_one(
            {'_id': appointment_oid},
            {'$set': {'status': 'cancelled'}}
        )

        if update_result.modified_count == 1:
            return jsonify({"message": "Appointment cancelled successfully."}), 200
        elif update_result.matched_count == 1 and update_result.modified_count == 0:
             # This means it was already cancelled or status was different but matched _id
             app.logger.warning(f"Attempted to cancel appointment {appointment_oid} which was not modified (possibly already cancelled).")
             return jsonify({"message": "Appointment status was not 'upcoming' or already cancelled."}), 400 # Or return 200 if idempotent is ok
        else:
             # Should not happen if find_one succeeded, but safety check
             app.logger.error(f"Failed to find appointment {appointment_oid} during update for cancellation.")
             return jsonify({"error": "Appointment not found during update."}), 404

    except Exception as e:
        app.logger.error(f"Failed to cancel appointment {appointment_id_str} for patient {patient_oid}: {e}")
        return jsonify({"error": f"Failed to cancel appointment: {e}"}), 500

# Use string for ObjectId
@app.route('/api/appointments/<string:appointment_id_str>', methods=['PUT'])
def update_appointment(appointment_id_str):
    # patient_user is a dictionary
    patient_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type
    if patient_user.get('token_user_type') != 'patient':
        return jsonify({"error": "Unauthorized: Only patients can reschedule their appointments."}), 403

    data = request.get_json()
    if not data or not data.get('date') or not data.get('time'):
        return jsonify({"error": "Missing required fields (date, time)."}), 400

    new_date_str = data['date']
    new_time_str = data['time']

    try:
        appointment_oid = ObjectId(appointment_id_str)
        patient_oid = ObjectId(patient_user.get('_id')) # Get patient ObjectId from token context
    except Exception:
        return jsonify({"error": "Invalid ID format for appointment or patient."}), 400

    try:
        # --- Fetch Appointment ---
        appointment = db.appointments.find_one({'_id': appointment_oid})

        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        # --- Authorization Check ---
        if appointment.get('patient_id') != patient_oid:
            app.logger.warning(f"Forbidden attempt by patient {patient_oid} to update appointment {appointment_oid} belonging to {appointment.get('patient_id')}")
            return jsonify({"error": "Forbidden: You can only reschedule your own appointments."}), 403

        # --- Status Check ---
        if appointment.get('status') != 'upcoming':
            return jsonify({"error": f"Cannot reschedule appointment with status '{appointment.get('status')}'."}), 400

        # --- Check New Slot Availability ---
        doctor_oid = appointment.get('doctor_id') # Get doctor ObjectId from the appointment
        if not doctor_oid:
             app.logger.error(f"Appointment {appointment_oid} is missing doctor_id.")
             return jsonify({"error": "Internal server error: Appointment data inconsistent."}), 500

        # Pass doctor's ObjectId *string* to availability check
        if not check_backend_availability(str(doctor_oid), new_date_str, new_time_str):
            # Fetch doctor name for a more informative error message
            doctor = db.doctors.find_one({'_id': doctor_oid}, {'name': 1})
            doctor_name = doctor.get('name', 'Doctor') if doctor else 'Doctor'
            return jsonify({"error": f"Dr. {doctor_name} is not available at the selected new time or the slot is booked."}), 409

        # --- Update Appointment Datetime ---
        try:
            new_appointment_datetime = datetime.strptime(f"{new_date_str} {new_time_str}", "%Y-%m-%d %H:%M")

            update_result = db.appointments.update_one(
                {'_id': appointment_oid},
                {'$set': {'appointment_datetime': new_appointment_datetime}}
            )

            if update_result.modified_count == 1:
                # Construct response data (can re-fetch or use existing data + new datetime)
                updated_appointment_data = {
                    "id": str(appointment_oid),
                    "doctorId": str(doctor_oid),
                    "doctorName": appointment.get('doctor_name'),
                    "patientId": str(patient_oid),
                    "patientName": appointment.get('patient_name'),
                    "date": new_appointment_datetime.strftime('%Y-%m-%d'),
                    "time": new_appointment_datetime.strftime('%H:%M'),
                    "reason": appointment.get('reason'),
                    "status": appointment.get('status') # Status remains 'upcoming'
                }
                return jsonify({"message": "Appointment rescheduled successfully!", "appointment": updated_appointment_data}), 200
            elif update_result.matched_count == 1 and update_result.modified_count == 0:
                app.logger.warning(f"Appointment {appointment_oid} was not modified during reschedule (new time might be same as old).")
                return jsonify({"message": "Appointment time was not changed."}), 200 # Or return updated data anyway
            else:
                app.logger.error(f"Failed to find appointment {appointment_oid} during update for reschedule.")
                return jsonify({"error": "Appointment not found during update."}), 404

        except ValueError:
            return jsonify({"error": "Invalid date or time format provided."}), 400

    except Exception as e:
        app.logger.error(f"Failed to reschedule appointment {appointment_id_str} for patient {patient_oid}: {e}")
        return jsonify({"error": f"Failed to reschedule: {e}"}), 500

# Use string for ObjectId
@app.route('/api/appointments/<string:appointment_id_str>/complete', methods=['PUT'])
def complete_appointment(appointment_id_str):
    # doctor_user is a dictionary
    doctor_user, error, status_code = get_user_from_token()
    if error: return jsonify(error), status_code

    # Check user type
    if doctor_user.get('token_user_type') != 'doctor':
        return jsonify({"error": "Unauthorized: Only doctors can complete appointments."}), 403

    # Get doctor's profile ID string from token context
    doctor_id_str = doctor_user.get('doctor_id')
    if not doctor_id_str:
        app.logger.error(f"Doctor user {doctor_user.get('_id')} missing doctor_id in token context during appointment completion.")
        return jsonify({"error": "Internal server error: Doctor context missing."}), 500

    try:
        appointment_oid = ObjectId(appointment_id_str)
        doctor_oid = ObjectId(doctor_id_str) # Doctor's profile ObjectId
    except Exception:
        return jsonify({"error": "Invalid ID format for appointment or doctor."}), 400

    try:
        # --- Fetch Appointment ---
        appointment = db.appointments.find_one({'_id': appointment_oid})

        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        # --- Authorization Check ---
        # Ensure the doctor_id in the appointment matches the logged-in doctor's profile ID
        if appointment.get('doctor_id') != doctor_oid:
            app.logger.warning(f"Forbidden attempt by doctor {doctor_oid} to complete appointment {appointment_oid} belonging to doctor {appointment.get('doctor_id')}")
            return jsonify({"error": "Forbidden: You can only complete your own appointments."}), 403

        # --- Status Check ---
        if appointment.get('status') != 'upcoming':
            return jsonify({"error": f"Cannot complete appointment with status '{appointment.get('status')}'."}), 400

        # --- Update Status in MongoDB ---
        update_result = db.appointments.update_one(
            {'_id': appointment_oid},
            {'$set': {'status': 'completed'}}
        )

        if update_result.modified_count == 1:
            return jsonify({"message": "Appointment marked as complete."}), 200
        elif update_result.matched_count == 1 and update_result.modified_count == 0:
             app.logger.warning(f"Attempted to complete appointment {appointment_oid} which was not modified (possibly already completed).")
             return jsonify({"message": "Appointment status was not 'upcoming' or already completed."}), 400 # Or return 200 if idempotent is ok
        else:
             app.logger.error(f"Failed to find appointment {appointment_oid} during update for completion.")
             return jsonify({"error": "Appointment not found during update."}), 404

    except Exception as e:
        app.logger.error(f"Failed to complete appointment {appointment_id_str} for doctor {doctor_id_str}: {e}")
        return jsonify({"error": f"Failed to complete appointment: {e}"}), 500

# --- Static File Serving (for uploaded images) ---
@app.route('/uploads/profile_pics/<filename>')
def uploaded_file(filename):
    # Serve files from the configured UPLOAD_FOLDER
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- Run the App ---
if __name__ == '__main__':
    # Use port 5001 to avoid conflict with React's default 3000
    app.run(debug=True, port=5001)
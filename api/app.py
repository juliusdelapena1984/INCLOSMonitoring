import os
import pathlib

import requests
from flask import Flask, session, abort, redirect, request, jsonify
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from pip._vendor import cachecontrol
import google.auth.transport.requests
from flask_cors import CORS
import datetime

app = Flask(__name__)
# Enable CORS for all origins. In a production environment, restrict this to your frontend's domain.
CORS(app)

# In-memory data store for missions
# In a real application, you would use a database like Firestore, PostgreSQL, etc.
# We'll add a simple ID counter to simulate unique IDs for each mission.
missions_data = []
next_mission_id = 1

app.secret_key = "inc-los-elizabeth-nj.com"

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

GOOGLE_CLIENT_ID = "558831344966-7c3el595h2k4jdr9s21ulmncgmscutru.apps.googleusercontent.com"
client_secrets_file = os.path.join(pathlib.Path(__file__).parent, "client_secret.json")

flow = Flow.from_client_secrets_file(
    client_secrets_file=client_secrets_file,
    scopes=["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email", "openid"],
    redirect_uri="http://127.0.0.1:5000/callback"
)

# Authorized users (replace with your actual authorized IDs)
AUTHORIZED_IDS = {
    "julius.delapena1984@gmail.com",
    "dpjulius@gmail.com"
}


# In-memory mock database
# A real application would connect to a database
db = {
    "missions": [
        {
            "id": 1,
            "date": "2025-07-25",
            "time": "18:00",
            "location": "Elizabeth Function Hall",
            "workerName": "Jeffrey Dote",
            "workerImage": "https://placehold.co/40x40/FF0000/FFFFFF?text=JD",
            "nonMemberGuests": "John, Mary, 2 others",
            "attendedMembers": [
                {"memberId": "member_1", "memberGuests": "Jane's Mom"},
                {"memberId": "member_2", "memberGuests": "Michael's friend"}
            ],
            "guests": "John, Mary, 2 others, Jane's Mom, Michael's friend"
        },
        {
            "id": 2,
            "date": "2025-07-22",
            "time": "10:30",
            "location": "Union City Park",
            "workerName": "Maria Sanchez",
            "workerImage": "https://placehold.co/40x40/00FF00/FFFFFF?text=MS",
            "nonMemberGuests": "",
            "attendedMembers": [
                {"memberId": "member_3", "memberGuests": ""},
                {"memberId": "member_4", "memberGuests": "2 others"}
            ],
            "guests": "2 others"
        },
    ],
    "members": [
        {"id": "member_1", "fullName": "Jane Doe", "areaGroup": "Group A", "cfo": "CFO 1", "offices": "Office A"},
        {"id": "member_2", "fullName": "Michael Smith", "areaGroup": "Group B", "cfo": "CFO 2", "offices": "Office B"},
        {"id": "member_3", "fullName": "Emily White", "areaGroup": "Group A", "cfo": "CFO 1", "offices": "Office C"},
        {"id": "member_4", "fullName": "David Brown", "areaGroup": "Group C", "cfo": "CFO 3", "offices": "Office A"},
        {"id": "member_5", "fullName": "Sarah Davis", "areaGroup": "Group B", "cfo": "CFO 2", "offices": "Office B"},
        {"id": "member_6", "fullName": "Chris Johnson", "areaGroup": "Group A", "cfo": "CFO 1", "offices": "Office C"},
        {"id": "member_7", "fullName": "Jessica Miller", "areaGroup": "Group C", "cfo": "CFO 3", "offices": "Office A"},
        {"id": "member_8", "fullName": "Robert Wilson", "areaGroup": "Group B", "cfo": "CFO 2", "offices": "Office B"},
    ],
    "venues": [
        {"id": "venue_1", "name": "Elizabeth Function Hall", "address": "123 Main St, Elizabeth, NJ"},
        {"id": "venue_2", "name": "Union City Park", "address": "456 Park Ave, Union City, NJ"},
        {"id": "venue_3", "name": "Jersey City Auditorium", "address": "789 City Blvd, Jersey City, NJ"},
    ],
    "evangelicalWorkers": [
        {"id": "worker_1", "name": "Jeffrey Dote", "image": "https://placehold.co/40x40/FF0000/FFFFFF?text=JD"},
        {"id": "worker_2", "name": "Maria Sanchez", "image": "https://placehold.co/40x40/00FF00/FFFFFF?text=MS"},
        {"id": "worker_3", "name": "Carlos Ramirez", "image": "https://placehold.co/40x40/0000FF/FFFFFF?text=CR"},
    ]
}

# Helper function to aggregate guest strings
def aggregate_guests(non_member_guests, attended_members):
    all_guests = []
    if non_member_guests and non_member_guests.strip():
        all_guests.append(non_member_guests.strip())

    for member in attended_members:
        if member.get("memberGuests") and member["memberGuests"].strip():
            all_guests.append(member["memberGuests"].strip())

    return ", ".join(filter(None, all_guests)) # Join only non-empty strings

# --- Mission Endpoints ---
@app.route('/api/missions', methods=['GET'])
def get_missions():
    """
    GET endpoint to retrieve all Bible missions.
    Returns:
        JSON: A list of mission dictionaries, including their IDs and attendedMembers.
    """
    # Sort missions by date and time in ascending order (latest from left to right)
    sorted_missions = sorted(db['missions'], key=lambda m: (m['date'], m['time']))
    return jsonify(sorted_missions)

@app.route('/api/missions/<int:mission_id>', methods=['GET'])
def get_mission_by_id(mission_id):
    """
    GET endpoint to retrieve a single Bible mission by its ID.
    Args:
        mission_id (int): The ID of the mission to retrieve.
    Returns:
        JSON: The mission dictionary if found, or an error message if not.
        Status Code: 200 on success, 404 if not found.
    """
    mission = next((m for m in db['missions'] if m["id"] == mission_id), None)
    if mission:
        return jsonify(mission)
    return jsonify({"error": "Mission not found"}), 404

@app.route('/api/missions', methods=['POST'])
def add_mission():
    """
    POST endpoint to add a new Bible mission.
    Expects JSON data in the request body.
    Returns:
        JSON: The newly added mission data with its assigned ID.
        Status Code: 201 on success, 400 on invalid data.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400

    # Basic validation for required fields
    required_fields = ["date", "time", "location", "workerName"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Handle optional fields and new structure
    non_member_guests = data.get("nonMemberGuests", "")
    attended_members = data.get("attendedMembers", [])
    if not isinstance(attended_members, list):
        return jsonify({"error": "attendedMembers must be a list"}), 400

    # Ensure attendedMembers entries have memberId and memberGuests
    for member_entry in attended_members:
        if not isinstance(member_entry, dict) or "memberId" not in member_entry or "memberGuests" not in member_entry:
            return jsonify({"error": "Each attended member entry must have 'memberId' and 'memberGuests'"}), 400

    data["attended"] = len(attended_members)
    data["guests"] = aggregate_guests(non_member_guests, attended_members)

    # Add a default image if not provided
    if "workerImage" not in data or not data["workerImage"]:
        data["workerImage"] = "https://placehold.co/40x40/FF0000/FFFFFF?text=JD"

    # Assign a unique ID and add to the list
    max_id = max([m['id'] for m in db['missions']] + [0])
    data["id"] = max_id + 1
    db['missions'].append(data)
    return jsonify(data), 201

@app.route('/api/missions/<int:mission_id>', methods=['PUT'])
def update_mission(mission_id):
    """
    PUT endpoint to update an existing Bible mission.
    Expects JSON data in the request body.
    Args:
        mission_id (int): The ID of the mission to update.
    Returns:
        JSON: The updated mission data.
        Status Code: 200 on success, 400 on invalid data, 404 if not found.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400

    mission_found = False
    for i, mission in enumerate(db['missions']):
        if mission["id"] == mission_id:
            # Update only the fields provided in the request
            for key, value in data.items():
                if key == "nonMemberGuests":
                    db['missions'][i][key] = str(value)
                elif key == "attendedMembers":
                    if isinstance(value, list):
                        # Validate each entry in attendedMembers
                        for member_entry in value:
                            if not isinstance(member_entry, dict) or "memberId" not in member_entry or "memberGuests" not in member_entry:
                                return jsonify({"error": "Each attended member entry must have 'memberId' and 'memberGuests'"}), 400
                        db['missions'][i][key] = value
                        db['missions'][i]["attended"] = len(value) # Update attended count
                    else:
                        return jsonify({"error": "attendedMembers must be a list"}), 400
                else:
                    db['missions'][i][key] = value

            # Recalculate 'guests' field after updates
            db['missions'][i]["guests"] = aggregate_guests(
                db['missions'][i].get("nonMemberGuests", ""),
                db['missions'][i].get("attendedMembers", [])
            )
            mission_found = True
            return jsonify(db['missions'][i])
    if not mission_found:
        return jsonify({"error": "Mission not found"}), 404

@app.route('/api/missions/<int:mission_id>', methods=['DELETE'])
def delete_mission(mission_id):
    """
    DELETE endpoint to remove a Bible mission.
    Args:
        mission_id (int): The ID of the mission to delete.
    Returns:
        JSON: A success message.
        Status Code: 200 on success, 404 if not found.
    """
    original_len = len(db['missions'])
    db['missions'] = [m for m in db['missions'] if m["id"] != mission_id]
    if len(db['missions']) < original_len:
        return jsonify({"message": f"Mission with ID {mission_id} deleted successfully"}), 200
    return jsonify({"error": "Mission not found"}), 404

# --- Reference Data Endpoint ---
@app.route('/api/referencedata', methods=['GET'])
def get_referencedata():
    """
    API endpoint to get all reference data (members, venues, evangelical workers) in a single call.
    Returns:
        JSON: An object containing lists of members, venues, and evangelical workers.
    """
    return jsonify({
        "members": db['members'],
        "venues": db['venues'],
        "evangelicalWorkers": db['evangelicalWorkers']
    })

def login_is_required(function):
    def wrapper(*args, **kwargs):
        if "google_id" not in session:
            return redirect("/login")
        else:
            return function()

    return wrapper


@app.route("/login")
def login():
    authorization_url, state = flow.authorization_url()
    session["state"] = state
    return redirect(authorization_url)


@app.route("/callback")
def callback():
    flow.fetch_token(authorization_response=request.url)

    if not session["state"] == request.args["state"]:
        abort(500)  # State does not match!

    credentials = flow.credentials
    request_session = requests.session()
    cached_session = cachecontrol.CacheControl(request_session)
    token_request = google.auth.transport.requests.Request(session=cached_session)

    id_info = id_token.verify_oauth2_token(
        id_token=credentials._id_token,
        request=token_request,
        audience=GOOGLE_CLIENT_ID
    )

    user_email = id_info['email']

    # Check if user is authorized
    if user_email not in AUTHORIZED_IDS:
        return "Unauthorized Access", 403

    session["google_id"] = id_info.get("sub")
    session["name"] = id_info.get("name")
    return redirect("/")


@app.route("/")
@login_is_required
def index():
    return f"Hello {session['name']}! <br/> <a href='/logout'><button>Logout</button></a>"


if __name__ == "__main__":
    app.run(debug=True)
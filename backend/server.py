
from flask import Flask, request, jsonify, send_from_directory
import os
import json

app = Flask(__name__, static_folder='../frontend')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0 # Disable caching
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'user_data')

# --- Helper Functions ---
def get_user_filepath(username):
    if not username or not username.isalnum():
        return None
    return os.path.join(USER_DATA_DIR, f'{username}.json')

# --- API Routes ---
@app.route('/api/user/data', methods=['GET'])
def get_user_data():
    username = request.args.get('username')
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({'error': 'Invalid username'}), 400

    if not os.path.exists(filepath):
        # If user file doesn't exist, return default initial state
        return jsonify({'isNewUser': True})

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/data', methods=['POST'])
def save_user_data():
    data = request.get_json()
    username = data.get('username')
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({'error': 'Invalid username'}), 400

    if not os.path.exists(USER_DATA_DIR):
        os.makedirs(USER_DATA_DIR)

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data.get('payload'), f, ensure_ascii=False, indent=4)
        return jsonify({'message': 'Data saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Serve Static Files ---
DATA_ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')

@app.route('/data/<path:path>')
def serve_data_files(path):
    """Serves files from the root /data directory."""
    return send_from_directory(DATA_ROOT, path)

# --- Serve Frontend ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # This is a bit of a catch-all. Be careful in production.
    # It tries to serve files from frontend/, then frontend/js/, etc.
    # A more robust solution would be to have nginx handle static files.
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    if not os.path.exists(USER_DATA_DIR):
        os.makedirs(USER_DATA_DIR)
    app.run(debug=True, port=5001) # Using a different port to avoid conflicts

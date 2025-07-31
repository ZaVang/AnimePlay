
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

# --- Character API Routes ---
@app.route('/api/characters', methods=['GET'])
def get_characters():
    """Get a list of character IDs or filtered characters."""
    try:
        characters_dir = os.path.join(DATA_ROOT, 'characters')
        if not os.path.exists(characters_dir):
            return jsonify({'error': 'Characters directory not found'}), 404
        
        # Get query parameters
        limit = request.args.get('limit', type=int, default=50)
        offset = request.args.get('offset', type=int, default=0)
        
        # Get all character files
        character_files = [f for f in os.listdir(characters_dir) if f.endswith('.json')]
        character_ids = [int(f.replace('.json', '')) for f in character_files if f.replace('.json', '').isdigit()]
        character_ids.sort()
        
        # Apply pagination
        paginated_ids = character_ids[offset:offset + limit]
        
        return jsonify({
            'character_ids': paginated_ids,
            'total': len(character_ids),
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/characters/<int:character_id>', methods=['GET'])
def get_character(character_id):
    """Get specific character data by ID."""
    try:
        character_file = os.path.join(DATA_ROOT, 'characters', f'{character_id}.json')
        if not os.path.exists(character_file):
            return jsonify({'error': 'Character not found'}), 404
        
        with open(character_file, 'r', encoding='utf-8') as f:
            character_data = json.load(f)
        
        return jsonify(character_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/characters/batch', methods=['POST'])
def get_characters_batch():
    """Get multiple characters by IDs."""
    try:
        data = request.get_json()
        character_ids = data.get('ids', [])
        
        if not character_ids:
            return jsonify({'error': 'No character IDs provided'}), 400
        
        characters = []
        for char_id in character_ids:
            character_file = os.path.join(DATA_ROOT, 'characters', f'{char_id}.json')
            if os.path.exists(character_file):
                with open(character_file, 'r', encoding='utf-8') as f:
                    character_data = json.load(f)
                    characters.append(character_data)
        
        return jsonify({'characters': characters})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

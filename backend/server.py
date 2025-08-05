from flask import Flask, request, jsonify, send_from_directory, Blueprint
import os
import json

# --- 1. 创建主应用和 API 蓝图 ---
app = Flask(__name__, static_folder='../frontend-vue/dist')
api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- 常量和辅助函数 ---
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'user_data')
DATA_ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')

def get_user_filepath(username):
    if not username or not username.isalnum():
        return None
    return os.path.join(USER_DATA_DIR, f'{username}.json')

# --- 2. 将所有 API 路由注册到蓝图上 ---
@api_bp.route('/user/data', methods=['GET'])
def get_user_data():
    username = request.args.get('username')
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({'error': 'Invalid username'}), 400

    if not os.path.exists(filepath):
        return jsonify({'isNewUser': True})

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user/data', methods=['POST'])
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

@api_bp.route('/characters', methods=['GET'])
def get_characters():
    try:
        characters_file = os.path.join(DATA_ROOT, 'characters', 'all_cards.json')
        if not os.path.exists(characters_file):
            return jsonify({'error': 'Characters file not found'}), 404
        
        with open(characters_file, 'r', encoding='utf-8') as f:
            all_characters = json.load(f)
        
        # 为了与前端 store 兼容，直接返回角色详情列表
        # 我们不再需要 limit 和 offset，因为前端会一次性加载所有数据
        return jsonify({'characters': all_characters})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/characters/<int:character_id>', methods=['GET'])
def get_character(character_id):
    try:
        character_file = os.path.join(DATA_ROOT, 'characters', f'{character_id}.json')
        if not os.path.exists(character_file):
            return jsonify({'error': 'Character not found'}), 404
        
        with open(character_file, 'r', encoding='utf-8') as f:
            character_data = json.load(f)
        
        return jsonify(character_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/characters/batch', methods=['POST'])
def get_characters_batch():
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

# --- 3. 在主应用中注册蓝图 ---
app.register_blueprint(api_bp)

# --- 静态文件和 Vue 应用服务 ---
@app.route('/data/<path:path>')
def serve_data_files(path):
    """专门为 /data 目录服务."""
    return send_from_directory(DATA_ROOT, path)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_vue_app(path):
    """
    服务 Vue 应用的 catch-all 路由。
    它只处理非 API 和非 /data 的请求。
    """
    # 如果请求的是一个存在于 dist 目录中的真实文件（如 antd.js, antd.css），则直接发送它
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    # 否则，发送 index.html，让 Vue Router 来处理路由
    else:
        return send_from_directory(app.static_folder, 'index.html')

# --- 启动 ---
if __name__ == '__main__':
    if not os.path.exists(USER_DATA_DIR):
        os.makedirs(USER_DATA_DIR)
    app.run(debug=True, port=5001)

import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 serve_static 函数
old_func = '''@app.route("/<path:path>")
def serve_static(path):
    # It tries to serve files from frontend/, then frontend/js/, etc.
    # A more robust solution would be to have nginx handle static files.
    return send_from_directory(app.static_folder, path)'''

new_func = '''@app.route("/<path:path>")
def serve_static(path):
    # API 和数据路由不处理
    if path.startswith('api/') or path.startswith('data/'):
        return jsonify({"error": "Not found"}), 404
    
    # 尝试返回静态文件
    try:
        return send_from_directory(app.static_folder, path)
    except:
        # SPA 路由：找不到文件时返回 index.html
        return send_from_directory(app.static_folder, "index.html")'''

content = content.replace(old_func, new_func)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("SPA 路由修复完成")

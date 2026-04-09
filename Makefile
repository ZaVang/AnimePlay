.PHONY: start frontend backend install

start:
	@echo "🎮 启动 AnimePlay (前端 & 后端)..."
	@$(MAKE) -j 2 frontend backend

frontend:
	cd frontend-vue && npm run dev

backend:
	python start_server.py

install:
	@echo "📦 安装项目依赖..."
	cd frontend-vue && npm install
	pip install -r requirements.txt

clean:
	@echo "🧹 清理缓存文件..."
	cd frontend-vue && rm -rf node_modules
	find . -type d -name "__pycache__" -exec rm -rf {} +

@echo off
echo Starting AnimePlay (Frontend and Backend)...
echo.

echo Starting Backend Service...
start "AnimePlay Backend" cmd /k "python start_server.py"

echo Starting Frontend Service...
start "AnimePlay Frontend" cmd /k "cd frontend-vue && npm run dev"

echo Done! Two new console windows should have popped up.

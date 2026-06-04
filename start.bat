@echo off
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$backend = Test-NetConnection 127.0.0.1 -Port 5000 -InformationLevel Quiet; " ^
  "$site = Test-NetConnection 127.0.0.1 -Port 8000 -InformationLevel Quiet; " ^
  "if (-not $backend) { Start-Process -FilePath python -ArgumentList 'app.py' -WorkingDirectory (Get-Location) -WindowStyle Hidden; Write-Host 'Started backend on http://127.0.0.1:5000' } else { Write-Host 'Backend already running on http://127.0.0.1:5000' }; " ^
  "if (-not $site) { Start-Process -FilePath python -ArgumentList '-m','http.server','8000' -WorkingDirectory (Get-Location) -WindowStyle Hidden; Write-Host 'Started website on http://localhost:8000' } else { Write-Host 'Website already running on http://localhost:8000' }"

echo.
echo MoodLens is starting.
echo Open http://localhost:8000 in your browser.

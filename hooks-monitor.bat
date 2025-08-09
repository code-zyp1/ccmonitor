@echo off
echo [%date% %time%] GitButler hooks monitoring started...
echo.

:monitor_loop
echo --- Git Status Check ---
git status --porcelain
echo.

echo --- Recent Git Log ---
git log --oneline -3
echo.

echo --- GitButler Status ---
but status
echo.

echo --- Waiting 10 seconds for next check ---
timeout /t 10 /nobreak >nul
goto monitor_loop
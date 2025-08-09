@echo off
echo [%date% %time%] Auto-commit script triggered

REM Check if there are changes to commit
git diff-index --quiet HEAD --
if %ERRORLEVEL% EQU 0 (
    echo No changes to commit
    exit /b 0
)

REM Add all changes
git add .

REM Create commit with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

git commit -m "Auto-commit: Claude Code session changes - %timestamp%"

echo Auto-commit completed successfully
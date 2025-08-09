@echo off
echo.
echo ================================
echo  Claude Code Auto-Commit Hooks
echo  Global Installation Script
echo ================================
echo.

:: Check if we're in a Git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This is not a Git repository!
    echo Please run this script in a Git project directory.
    pause
    exit /b 1
)

echo [INFO] Installing Auto-Commit Hooks...

:: Create directories
if not exist ".claude" mkdir ".claude"
if not exist "scripts" mkdir "scripts"

:: Create .claude/settings.json
echo [INFO] Creating .claude/settings.json...
(
echo {
echo   "permissions": {
echo     "allow": [
echo       "Bash(git add:*)",
echo       "Bash(git commit:*)",
echo       "Bash(git status:*)",
echo       "Bash(git diff:*)",
echo       "Bash(dir)",
echo       "Bash(mkdir:*)",
echo       "Bash(rm:*)",
echo       "Bash(cat:*)"
echo     ]
echo   },
echo   "hooks": {
echo     "PostToolUse": [
echo       {
echo         "matcher": "Edit|MultiEdit|Write",
echo         "hooks": [
echo           {
echo             "type": "command",
echo             "command": "scripts\\auto-commit-hook.bat",
echo             "description": "Auto-commit with AI-generated commit messages"
echo           }
echo         ]
echo       }
echo     ]
echo   }
echo }
) > ".claude\settings.json"

:: Create scripts/auto-commit-hook.bat
echo [INFO] Creating scripts/auto-commit-hook.bat...
(
echo @echo off
echo setlocal enabledelayedexpansion
echo.
echo :: Auto-commit hook with AI commit message generation
echo.
echo cd /d "%%~dp0\.."
echo.
echo :: Check if there are any changes
echo git status --porcelain ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 exit /b 0
echo.
echo :: Stage all changes
echo git add . ^>nul 2^>^&1
echo.
echo :: Check if there are staged changes
echo git diff --cached --quiet
echo if %%errorlevel%% == 0 exit /b 0
echo.
echo :: Generate AI commit message using Claude Code
echo git diff --cached --name-status ^> temp_changes.txt
echo echo. ^>^> temp_changes.txt
echo echo Changes to commit: ^>^> temp_changes.txt
echo git diff --cached --stat ^>^> temp_changes.txt
echo.
echo :: Use Claude Code to generate commit message
echo claude --print "Generate a concise git commit message for the following changes. Use conventional commit format (feat:, fix:, docs:, etc.^). Return only the commit message, no explanations. Changes:" ^< temp_changes.txt ^> temp_commit_msg.txt 2^>nul
echo.
echo :: Extract the commit message
echo set "commit_msg="
echo for /f "tokens=*" %%%%i in (temp_commit_msg.txt^) do (
echo     if not "%%%%i"=="" set "commit_msg=%%%%i"
echo ^)
echo.
echo :: Clean up temporary files
echo del temp_changes.txt ^>nul 2^>^&1
echo del temp_commit_msg.txt ^>nul 2^>^&1
echo.
echo :: Fallback message if AI generation fails
echo if "!commit_msg!"=="" (
echo     set "commit_msg=feat: auto-commit with hooks integration"
echo ^)
echo.
echo :: Clean the message and commit
echo set "commit_msg=!commit_msg:"=!"
echo git commit -m "!commit_msg!" ^>nul 2^>^&1
) > "scripts\auto-commit-hook.bat"

:: Make script executable (on Windows this is automatic)
echo [INFO] Setting script permissions...

:: Add to .gitignore if it exists
if exist ".gitignore" (
    echo [INFO] Adding temp files to .gitignore...
    findstr /C:"temp_changes.txt" .gitignore >nul 2>&1
    if %errorlevel% neq 0 (
        echo temp_changes.txt >> .gitignore
        echo temp_commit_msg.txt >> .gitignore
        echo debug-hook.log >> .gitignore
        echo auto-commit.log >> .gitignore
    )
)

echo.
echo ================================
echo  Installation Complete! 
echo ================================
echo.
echo [SUCCESS] Auto-Commit Hooks installed successfully!
echo.
echo Next steps:
echo 1. Restart Claude Code to load the new configuration
echo 2. Make any file changes using Edit/MultiEdit/Write
echo 3. Watch the magic happen - AI will auto-generate commit messages!
echo.
echo Files created:
echo   .claude\settings.json       - Configuration and hooks
echo   scripts\auto-commit-hook.bat - AI commit script
echo.
echo Note: The system only commits locally, it will NOT push to remote.
echo You'll need to manually push when ready: git push
echo.
pause
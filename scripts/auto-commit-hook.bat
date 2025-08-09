@echo off
setlocal enabledelayedexpansion

:: Auto-commit hook with AI commit message generation
:: Uses Claude Code Task tool for intelligent commit messages

cd /d "%~dp0\.."
echo [DEBUG] Script started >> debug-hook.log

:: Check if there are any changes
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 (
    echo [DEBUG] No git repo or git error >> debug-hook.log
    exit /b 0
)
echo [DEBUG] Git status check passed >> debug-hook.log

:: Stage all changes
git add . >nul 2>&1
echo [DEBUG] Files staged >> debug-hook.log

:: Check if there are staged changes
git diff --cached --quiet
if %errorlevel% == 0 (
    echo [DEBUG] No staged changes, exiting >> debug-hook.log
    exit /b 0
)
echo [DEBUG] Found staged changes, proceeding >> debug-hook.log

:: Generate AI commit message using Claude Code Task tool
echo Generating AI commit message...

:: Create a temporary prompt file with git diff context
git diff --cached --name-status > temp_changes.txt
echo. >> temp_changes.txt
echo Changes to commit: >> temp_changes.txt
git diff --cached --stat >> temp_changes.txt

:: Use Claude Code Task tool to generate commit message
claude --print "Generate a concise git commit message for the following changes. Use conventional commit format (feat:, fix:, docs:, etc.). Return only the commit message, no explanations. Changes:" < temp_changes.txt > temp_commit_msg.txt 2>nul

:: Extract the commit message (get the last non-empty line)
set "commit_msg="
for /f "tokens=*" %%i in (temp_commit_msg.txt) do (
    if not "%%i"=="" set "commit_msg=%%i"
)

:: Clean up temporary files
del temp_changes.txt >nul 2>&1
del temp_commit_msg.txt >nul 2>&1

:: Fallback message if AI generation fails
if "!commit_msg!"=="" (
    set "commit_msg=feat: auto-commit with hooks integration"
)

:: Clean the message (remove quotes if any)
set "commit_msg=!commit_msg:"=!"

:: Commit with AI-generated message
git commit -m "!commit_msg!" >nul 2>&1

:: Log the result (optional - for debugging)
echo [%date% %time%] Committed: !commit_msg! >> auto-commit.log
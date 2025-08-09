@echo off
setlocal enabledelayedexpansion

:: Auto-commit hook - simple version for testing
:: Runs when Claude Code session ends

cd /d "%~dp0\.."

:: Check if there are any changes
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 exit /b 0

:: Stage all changes
git add . >nul 2>&1

:: Check if there are staged changes
git diff --cached --quiet
if %errorlevel% == 0 exit /b 0

:: Generate simple commit message based on files changed
echo Auto-commit hook triggered
for /f "tokens=*" %%i in ('git diff --cached --name-only') do (
    echo Changed: %%i
)

:: For now, use a simple commit message - we'll enhance with AI later
set "commit_msg=feat: auto-commit hook implementation and testing"

:: Commit with message
git commit -m "!commit_msg!" >nul 2>&1

if %errorlevel% == 0 (
    echo Successfully committed with: !commit_msg!
) else (
    echo Commit failed
)
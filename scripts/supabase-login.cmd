@echo off
setlocal
cd /d "%~dp0.."
set "SUPABASE_HOME=%CD%\.supabase-cli"
echo Complete the official Supabase browser login, then enter its verification code here.
echo Do not paste access tokens into chat.
call "%CD%\node_modules\.bin\supabase.cmd" login --agent no --output-format text
if errorlevel 1 (
  echo Login did not complete. You can rerun scripts\supabase-login.cmd.
) else (
  echo Login complete. Return to the LoveApp conversation.
)
endlocal

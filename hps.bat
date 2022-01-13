@echo off
rem chcp 65001

set NODE_OPTIONS=--max-old-space-size=8192

:start

"%programfiles%\nodejs\node" hps.js

"%programfiles%\Google\Chrome\Application\chrome.exe" "C:\Program Files\nodejs\osu-hits-per-minute-main\beatmapsQueryResult.html"

echo %CD%

pause

goto start
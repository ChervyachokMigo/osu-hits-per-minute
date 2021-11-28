@echo off
rem chcp 65001


cd "C:\Program Files\nodejs\"

set NODE_OPTIONS=--max-old-space-size=8192

:start

node hps.js

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "C:\Program Files\nodejs\beatmaps.html"

pause

goto start
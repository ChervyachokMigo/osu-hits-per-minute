@echo off
rem chcp 65001


cd "C:\Program Files\nodejs\"

set NODE_OPTIONS=--max-old-space-size=8192

node hps.js

pause
"C:\Program Files\Google\Chrome\Application\chrome.exe" "C:\Program Files\nodejs\beatmaps.html"
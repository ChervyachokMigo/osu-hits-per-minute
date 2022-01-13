@echo off
rem chcp 65001

set NODE_OPTIONS=--max-old-space-size=8192

:start

"%programfiles%\nodejs\node" hps.js

start "" "%programfiles%\Google\Chrome\Application\chrome.exe" beatmapsQueryResult.html

pause

goto start
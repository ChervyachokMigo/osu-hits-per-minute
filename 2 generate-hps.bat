@echo off
rem chcp 65001

set NODE_OPTIONS=--max-old-space-size=8192

:start

node hps.js

"%programfiles%\Google\Chrome\Application\chrome.exe" "%CD%\beatmapsQueryResult.html"
echo **********************************
echo press anykey to generate new page
echo **********************************

pause

goto start
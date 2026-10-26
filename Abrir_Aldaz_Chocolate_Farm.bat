@echo off
title ALDAZ CHOCOLATE FARM - Sistema de Control
cd /d "%~dp0"
start "" "http://localhost:3456"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"

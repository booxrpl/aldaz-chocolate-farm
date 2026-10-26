# ALDAZ CHOCOLATE FARM - Management & Control System

A tailored, responsive web application for cocoa farm management, designed for desktop and mobile devices.

## Features
- **1. Employees & Schedules (`Empleados y Horario`)**:
  - Employee management with full-day and half-day wage configurations.
  - Weekly schedule management per sector (El Guineo, La Fortuna, El Guabo 1, Guabo 2).
  - Payroll calculation and historical payroll records.
- **2. Harvest Log (`Cosechas`)**:
  - Daily cocoa harvest registration by sector.
  - Tracking of wet harvest weight in the field (*Peso en Finca*) and dried cocoa weight (*Peso Seco*).
  - Dry weight logging/editing tool once beans finish drying.
  - Complete history log with sector filtering and delete confirmation protection.
- **Live Cocoa Market Price**:
  - Real-time international cocoa commodity pricing (ICE New York CC=F).
- **Multi-Device Storage**:
  - Automatic persistent storage in browser `localStorage`.
  - 1-click JSON backup export and import.
  - Local multi-device synchronization over local Wi-Fi.

## Running Locally
Double-click `Abrir_Aldaz_Chocolate_Farm.bat` or run:
```powershell
powershell -ExecutionPolicy Bypass -File .\servidor.ps1
```
Then navigate to `http://localhost:3456/` in your browser.

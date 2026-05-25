# GymFlow - Fingerprint Python App

## Overview

Python application running locally on the reception PC to handle USB fingerprint device communication. This app captures fingerprints and sends attendance data to the GymFlow web application.

## Architecture

```
Fingerprint Device (USB)
         ↓
Python App (Local PC)
         ↓
GymFlow Web API
         ↓
Supabase Database
```

## Supported Devices

- ZKTeco K40 / K50
- eSSL (fingerprint devices)
- Mantra (fingerprint devices)
- Other devices with Python SDK support

## Installation

### 1. Prerequisites
- Python 3.8+ installed
- USB fingerprint device connected
- GymFlow web app running and accessible

### 2. Setup

```bash
# Create virtual environment
python -m venv venv

# Activate environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

Create `config.json`:
```json
{
  "api_url": "http://localhost:3000",
  "device_type": "zkteco",
  "device_port": "COM3",
  "device_baudrate": 9600,
  "retry_attempts": 3,
  "timeout_seconds": 10
}
```

## Usage

```bash
python app.py
```

A simple window will appear:
- Shows when device is connected
- Shows member name when finger is scanned
- Shows success/error message
- Displays attendance marked status

## How It Works

1. **Device Connection**: Connects to USB fingerprint device
2. **Scan Detection**: Waits for finger scan
3. **API Call**: Sends scan data to `/api/fingerprint/scan`
4. **Response**: Shows member name and status message
5. **Repeat**: Goes back to waiting for next scan

## API Endpoint

**POST** `/api/fingerprint/scan`

Request:
```json
{
  "fingerprint_template": "binary_template_data_base64",
  "device_id": "device_unique_id",
  "timestamp": "2026-05-21T10:30:00Z"
}
```

Response:
```json
{
  "success": true,
  "member": {
    "id": "member_id",
    "name": "John Doe",
    "membership_no": "M001"
  },
  "message": "Attendance marked successfully"
}
```

## Troubleshooting

### Device Not Detected
- Check USB connection
- Install device drivers from manufacturer
- Try different USB port
- Check device_port in config.json

### API Connection Error
- Verify GymFlow web app is running
- Check `api_url` in config.json
- Ensure firewall allows local connections
- Test with: `curl http://localhost:3000/api/fingerprint/config`

### Fingerprint Not Matching
- Ensure member exists in database
- Check fingerprint templates are stored
- Try re-registering member fingerprint

## SDK References

- **ZKTeco**: https://github.com/fananimi/pyzk
- **eSSL**: Check manufacturer documentation
- **Mantra**: Check manufacturer SDK

## Next Steps

1. Install fingerprint device SDK
2. Create device communication module
3. Implement fingerprint template extraction
4. Build UI with PyQt/Tkinter
5. Test with sample members
6. Deploy to reception PC

## Environment Setup for Reception PC

1. Install Python 3.8+
2. Clone GymFlow repository
3. Setup virtual environment
4. Install dependencies
5. Configure config.json with device settings
6. Create Windows Task Scheduler job to auto-start on PC boot
7. Place shortcut in Startup folder for manual launch

---

**Note**: This app runs locally on the reception PC only. It does NOT require internet connection beyond initial API calls to mark attendance.

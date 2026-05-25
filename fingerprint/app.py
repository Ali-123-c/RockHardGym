"""
GymFlow Fingerprint Device Integration
Main Python application for fingerprint scanning
"""

import json
import time
import requests
from typing import Optional, Dict, Any
import tkinter as tk
from tkinter import ttk
import threading

# TODO: Import fingerprint device SDK based on config
# from pyzk import ZK

class FingerprintApp:
    def __init__(self, config_path: str = "config.json"):
        self.config = self.load_config(config_path)
        self.api_url = self.config.get("api_url", "http://localhost:3000")
        self.device = None
        self.running = False
        
        # Setup UI
        self.setup_ui()
        
    def load_config(self, path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Config file not found: {path}")
            return {}
    
    def setup_ui(self):
        """Setup Tkinter UI"""
        self.root = tk.Tk()
        self.root.title("GymFlow - Fingerprint Attendance")
        self.root.geometry("400x250")
        
        # Status label
        self.status_label = ttk.Label(self.root, text="Initializing...", font=("Arial", 12))
        self.status_label.pack(pady=10)
        
        # Device status
        self.device_status = ttk.Label(self.root, text="Device: Not Connected", foreground="red")
        self.device_status.pack(pady=5)
        
        # Member info
        self.member_label = ttk.Label(self.root, text="Waiting for fingerprint...", font=("Arial", 10))
        self.member_label.pack(pady=5)
        
        # Log area
        self.log_text = tk.Text(self.root, height=8, width=50)
        self.log_text.pack(pady=5, padx=5)
        
        # Buttons
        button_frame = ttk.Frame(self.root)
        button_frame.pack(pady=10)
        
        ttk.Button(button_frame, text="Start Scanning", command=self.start_scanning).pack(side="left", padx=5)
        ttk.Button(button_frame, text="Stop", command=self.stop_scanning).pack(side="left", padx=5)
        
    def connect_device(self) -> bool:
        """Connect to fingerprint device"""
        try:
            self.log("Connecting to device...")
            # TODO: Implement device connection based on config
            # self.device = ZK(...)
            # self.device.connect()
            self.device_status.config(text="Device: Connected", foreground="green")
            self.log("✓ Device connected successfully")
            return True
        except Exception as e:
            self.log(f"✗ Device connection failed: {str(e)}")
            self.device_status.config(text="Device: Failed", foreground="red")
            return False
    
    def send_attendance(self, member_id: str, fingerprint_data: Optional[str] = None) -> bool:
        """Send attendance data to GymFlow API"""
        try:
            payload = {
                "member_id": member_id,
                "scan_time": time.time(),
            }
            if fingerprint_data:
                payload["fingerprint_template"] = fingerprint_data
            
            response = requests.post(
                f"{self.api_url}/api/fingerprint/scan",
                json=payload,
                timeout=self.config.get("timeout_seconds", 10)
            )
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    member = data.get("member", {})
                    name = member.get("name", "Unknown")
                    self.member_label.config(text=f"✓ Welcome, {name}!", foreground="green")
                    self.log(f"✓ Attendance marked for {name}")
                    return True
            
            self.log(f"✗ API Error: {response.status_code}")
            return False
            
        except requests.exceptions.RequestException as e:
            self.log(f"✗ Connection error: {str(e)}")
            return False
    
    def scan_fingerprint(self):
        """Listen for fingerprint scans"""
        try:
            self.log("Waiting for fingerprint scan...")
            # TODO: Implement fingerprint scanning logic
            # fingerprint_data = self.device.get_template(...)
            # member_id = match_fingerprint(fingerprint_data)
            # self.send_attendance(member_id, fingerprint_data)
        except Exception as e:
            self.log(f"✗ Scan error: {str(e)}")
    
    def start_scanning(self):
        """Start scanning loop in background"""
        if not self.running:
            self.running = True
            self.status_label.config(text="Status: Scanning Active", foreground="green")
            
            if not self.connect_device():
                self.running = False
                self.status_label.config(text="Status: Device Error", foreground="red")
                return
            
            # Start scanning in background thread
            scan_thread = threading.Thread(target=self.scan_loop, daemon=True)
            scan_thread.start()
    
    def scan_loop(self):
        """Continuous scanning loop"""
        while self.running:
            try:
                self.scan_fingerprint()
                time.sleep(0.5)
            except Exception as e:
                self.log(f"✗ Scan loop error: {str(e)}")
                time.sleep(1)
    
    def stop_scanning(self):
        """Stop scanning"""
        self.running = False
        self.status_label.config(text="Status: Stopped", foreground="orange")
        self.log("Scanning stopped")
    
    def log(self, message: str):
        """Add message to log"""
        self.log_text.insert("end", message + "\n")
        self.log_text.see("end")
        self.root.update()
    
    def run(self):
        """Start the application"""
        self.root.mainloop()


if __name__ == "__main__":
    app = FingerprintApp()
    app.run()

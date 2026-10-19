# -*- coding: utf-8 -*-
"""
Step 2: Update server.py and create candidates_db.json
"""
import os
import json

DIRECTORY = r"c:\Users\karan\OneDrive\Desktop\Campus2Career\website"
CANDIDATES_FILE = os.path.join(DIRECTORY, "candidates_db.json")

seed_candidates = [
    {
        "id": "USR-DEMO-001",
        "name": "Rohan Varma",
        "username": "rohan_v",
        "email": "rohan@btech.ac.in",
        "password": "password123",
        "college": "Gujarat Technological University",
        "year": 3,
        "role": "learner",
        "branch": "ece",
        "stream": "ece",
        "isDemo": True,
        "verified": True,
        "verifiedReady": True,
        "verifiedToken": "BTECH-2026-ECE-702",
        "activeTrackPreset": "firmware",
        "initialLevel": "advanced",
        "totalStudyMinutes": 312,
        "streakDays": 6,
        "mcqHistory": [
            { "id": 101, "date": "2026-10-12", "module": "Embedded C & ARM Cortex-M Hardware", "score": 85, "mode": 10, "passed": True },
            { "id": 102, "date": "2026-10-15", "module": "FreeRTOS & Real-Time Kernel Internals", "score": 90, "mode": 20, "passed": True }
        ],
        "skillTimes": {
            "Embedded C & Register I/O": 180,
            "FreeRTOS & Real-Time Kernels": 132
        },
        "learningSessions": [
            { "id": 1, "date": "2026-10-16 14:30", "title": "STM32 NVIC & DMA Peripheral Architecture", "type": "Curriculum Study", "minutes": 45, "impact": "45 min tracked" },
            { "id": 2, "date": "2026-10-15 11:00", "title": "FreeRTOS Mutex Priority Inheritance Analysis", "type": "Curriculum Study", "minutes": 60, "impact": "60 min tracked" }
        ],
        "createdAt": "2026-10-01T10:00:00Z"
    },
    {
        "id": "USR-REC-001",
        "name": "Dr. Vikram Kulkarni",
        "username": "vikram_k",
        "email": "v.kulkarni@qualcomm.com",
        "password": "password123",
        "college": "Qualcomm Systems Architecture",
        "year": 0,
        "role": "recruiter",
        "branch": "ece",
        "stream": "ece",
        "isDemo": True,
        "verified": True,
        "verifiedReady": True,
        "verifiedToken": "REC-QUALCOMM-2026",
        "totalStudyMinutes": 0,
        "streakDays": 0,
        "mcqHistory": [],
        "skillTimes": {},
        "learningSessions": [],
        "createdAt": "2026-10-05T12:00:00Z"
    },
    {
        "id": "USR-STU-002",
        "name": "Priya Sharma",
        "username": "priya_s",
        "email": "priya.sharma@btech.ac.in",
        "password": "priyaPass2026!",
        "college": "Pune Institute of Computer Technology",
        "year": 4,
        "role": "learner",
        "branch": "it",
        "stream": "it",
        "isDemo": False,
        "verified": True,
        "verifiedReady": True,
        "verifiedToken": "BTECH-2026-IT-504",
        "activeTrackPreset": "java_cloud",
        "initialLevel": "advanced",
        "totalStudyMinutes": 240,
        "streakDays": 5,
        "mcqHistory": [
            { "id": 201, "date": "2026-10-14", "module": "Java Enterprise & JVM Internals", "score": 92, "mode": 10, "passed": True },
            { "id": 202, "date": "2026-10-17", "module": "PostgreSQL & Distributed Transactions", "score": 88, "mode": 10, "passed": True }
        ],
        "skillTimes": {
            "Java Enterprise": 150,
            "PostgreSQL": 90
        },
        "learningSessions": [
            { "id": 1, "date": "2026-10-14 16:00", "title": "Spring Boot Microservices & JPA Optimizations", "type": "Curriculum Study", "minutes": 90, "impact": "90 min tracked" }
        ],
        "createdAt": "2026-10-08T09:30:00Z"
    },
    {
        "id": "USR-STU-003",
        "name": "Amit Patel",
        "username": "amit_p",
        "email": "amit.patel@btech.ac.in",
        "password": "patelAmit#1",
        "college": "L.D. College of Engineering",
        "year": 3,
        "role": "learner",
        "branch": "mech",
        "stream": "mech",
        "isDemo": False,
        "verified": False,
        "verifiedReady": False,
        "verifiedToken": "BTECH-2026-MECH-301",
        "activeTrackPreset": "cad_cae",
        "initialLevel": "intermediate",
        "totalStudyMinutes": 185,
        "streakDays": 3,
        "mcqHistory": [
            { "id": 301, "date": "2026-10-16", "module": "SolidWorks & Parametric 3D Modeling", "score": 74, "mode": 10, "passed": True }
        ],
        "skillTimes": {
            "SolidWorks": 120,
            "FEA Simulation": 65
        },
        "learningSessions": [
            { "id": 1, "date": "2026-10-16 11:20", "title": "SolidWorks Non-linear FEA Simulation", "type": "Curriculum Study", "minutes": 65, "impact": "65 min tracked" }
        ],
        "createdAt": "2026-10-10T14:15:00Z"
    }
]

if not os.path.exists(CANDIDATES_FILE):
    with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
        json.dump(seed_candidates, f, indent=2)
    print("Created candidates_db.json with seed candidates.")
else:
    print("candidates_db.json already exists.")

# Now update server.py
with open("server.py", "r", encoding="utf-8") as f:
    srv = f.read()

# Add CANDIDATES_FILE and helper functions
candidates_helpers = '''CANDIDATES_FILE = os.path.join(DIRECTORY, "candidates_db.json")

def load_candidates():
    if os.path.exists(CANDIDATES_FILE):
        try:
            with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[DB Error] Could not read candidates_db.json: {e}")
            return []
    return []

def save_candidates(candidates):
    try:
        with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
            json.dump(candidates, f, indent=2)
        return True
    except Exception as e:
        print(f"[DB Error] Could not save candidates_db.json: {e}")
        return False
'''

if "CANDIDATES_FILE" not in srv:
    srv = srv.replace('CONFIG_FILE = os.path.join(DIRECTORY, "email_config.json")',
                      'CONFIG_FILE = os.path.join(DIRECTORY, "email_config.json")\n' + candidates_helpers, 1)
    print("[server.py] Added candidates file and loader helpers!")

# Add API endpoints in do_GET:
get_candidates_endpoint = '''        # API: Return candidate database for Sovereign Admin Suite
        if self.path == '/api/candidates':
            candidates = load_candidates()
            data = json.dumps({"success": True, "candidates": candidates}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
'''

if "self.path == '/api/candidates'" not in srv:
    srv = srv.replace("if self.path == '/api/emails':",
                      get_candidates_endpoint + "\n        if self.path == '/api/emails':", 1)
    print("[server.py] Added GET /api/candidates endpoint!")

# Add API endpoint in do_POST:
post_candidates_endpoint = '''        # 3. API: Save/Update Candidate Database from Admin Portal or App
        if self.path == '/api/candidates':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_length)
                payload = json.loads(post_body.decode('utf-8'))
                
                cands = load_candidates()
                if isinstance(payload, list):
                    cands = payload
                elif isinstance(payload, dict) and "candidates" in payload:
                    cands = payload["candidates"]
                elif isinstance(payload, dict):
                    cand_id = payload.get("id") or payload.get("email")
                    idx = next((i for i, c in enumerate(cands) if c.get("id") == cand_id or (cand_id and c.get("email") == payload.get("email"))), None)
                    if idx is not None:
                        cands[idx] = payload
                    else:
                        cands.append(payload)
                
                save_candidates(cands)
                res_data = json.dumps({"success": True, "message": "Candidate database updated successfully", "count": len(cands)}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(res_data)))
                self.end_headers()
                self.wfile.write(res_data)
                return
            except Exception as e:
                err_data = json.dumps({"success": False, "error": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_data)))
                self.end_headers()
                self.wfile.write(err_data)
                return
'''

if "# 3. API: Save/Update Candidate Database" not in srv:
    srv = srv.replace("super().do_POST()",
                      post_candidates_endpoint + "\n        super().do_POST()", 1)
    print("[server.py] Added POST /api/candidates endpoint!")

# In /verify endpoint, also mark candidate verified in candidates_db.json
old_verify_code = """            if found:
                save_emails(emails)
            
            # Redirect to index.html with verification params"""

new_verify_code = """            if found:
                save_emails(emails)

            # Synchronize verification status in candidates_db.json
            cands = load_candidates()
            for c in cands:
                if c.get('email', '').lower() == target_email.lower():
                    c['verified'] = True
                    c['verifiedReady'] = True
            save_candidates(cands)
            
            # Redirect to index.html with verification params"""

if old_verify_code in srv:
    srv = srv.replace(old_verify_code, new_verify_code, 1)
    print("[server.py] Synchronized /verify endpoint with candidates_db.json!")

with open("server.py", "w", encoding="utf-8") as f:
    f.write(srv)

print("Saved updated server.py!")

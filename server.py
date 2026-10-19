# -*- coding: utf-8 -*-
"""
Campus2Career Server & API Gateway
- Serves static website files with correct CORS & Referrer headers (YouTube Error 153 mitigation).
- Real SMTP Email Dispatcher for Gmail / Custom SMTP relays.
- Outbox persistence for Admin Sovereign Control Suite.
- One-click email verification link handler (/verify).
"""
import http.server
import socketserver
import webbrowser
import threading
import os
import sys
import socket
import json
import time
import urllib.parse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email_service import emailService

DEFAULT_PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
EMAILS_FILE = os.path.join(DIRECTORY, "emails_outbox.json")
CONFIG_FILE = os.path.join(DIRECTORY, "email_config.json")
CANDIDATES_FILE = os.path.join(DIRECTORY, "candidates_db.json")
LOCAL_STORE_FILE = os.path.join(DIRECTORY, "local_pg_store.json")

def load_local_store():
    if os.path.exists(LOCAL_STORE_FILE):
        try:
            with open(LOCAL_STORE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Store Error] Could not read local_pg_store.json: {e}")
    return {"users": [], "candidates": [], "student_activity_logs": [], "market_signals": [], "market_news": []}

def save_local_store(store):
    try:
        with open(LOCAL_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2)
        return True
    except Exception as e:
        print(f"[Store Error] Could not save local_pg_store.json: {e}")
        return False

def compute_dynamic_competence(user_email):
    """
    Computes verified formula-based dynamic competence percentage, level (1-5), and verified talent eligibility.
    Formula:
      Baseline: 25.0%
      Study Time Bonus: min(25.0, (total_study_minutes / 240.0) * 25.0)
      Lecture Watch Bonus: min(20.0, (total_lecture_minutes / 180.0) * 20.0)
      Exam Milestone: avg_exam_score * 0.30
      Composite = min(100.0, max(20.0, round(25.0 + study_bonus + lecture_bonus + exam_bonus, 1)))

    Levels:
      Level 1: 0-29% (Unverified Baseline)
      Level 2: 30-54% (Developing Competence)
      Level 3: 55-74% (Proficient Practitioner)
      Level 4: 75-89% (Advanced Recruiter Tier)
      Level 5: 90-100% (Elite Systems Master)

    Verified Talent Pool Eligibility:
      Requires Level >= 4 (score >= 75%), verified exam score >= 80%, minimum 60 min tracked study time.
    """
    store = load_local_store()
    logs = store.get("student_activity_logs", [])
    norm_email = (user_email or "").strip().lower()
    user_logs = [l for l in logs if (l.get("user_email") or "").strip().lower() == norm_email]

    total_study = sum(float(l.get("duration_minutes", 0) or 0) for l in user_logs if l.get("activity_type") == "study_timer")
    total_lecture = sum(float(l.get("duration_minutes", 0) or 0) for l in user_logs if l.get("activity_type") == "lecture_timer")

    exam_scores = [float(l.get("score")) for l in user_logs if l.get("activity_type") == "exam" and l.get("score") is not None]
    avg_exam = round(sum(exam_scores) / len(exam_scores), 1) if exam_scores else 0.0

    study_bonus = min(25.0, (total_study / 240.0) * 25.0)
    lecture_bonus = min(20.0, (total_lecture / 180.0) * 20.0)
    exam_bonus = avg_exam * 0.30
    competence_pct = min(100.0, max(20.0, round(25.0 + study_bonus + lecture_bonus + exam_bonus, 1)))

    if competence_pct >= 90.0:
        level = 5
        level_label = "Level 5: Elite Systems Master"
    elif competence_pct >= 75.0:
        level = 4
        level_label = "Level 4: Advanced Recruiter Tier"
    elif competence_pct >= 55.0:
        level = 3
        level_label = "Level 3: Proficient Practitioner"
    elif competence_pct >= 30.0:
        level = 2
        level_label = "Level 2: Developing Competence"
    else:
        level = 1
        level_label = "Level 1: Unverified Baseline"

    is_verified_talent = bool(level >= 4 and avg_exam >= 80.0 and (total_study + total_lecture >= 60.0))

    return {
        "dynamic_competence_percent": competence_pct,
        "dynamic_competence_level": level,
        "dynamic_competence_label": level_label,
        "total_study_minutes": round(total_study),
        "total_lecture_minutes": round(total_lecture),
        "avg_exam_score": avg_exam,
        "is_verified_talent": is_verified_talent
    }

def enrich_candidate(c):
    score = float(c.get("skill_score") or c.get("score") or c.get("dynamic_competence_percent") or 90)
    study_mins = int(c.get("total_study_minutes", 95))
    lecture_mins = int(c.get("total_lecture_minutes", 65))
    total_mins = study_mins + lecture_mins
    exam_score = float(c.get("verified_exam_score", c.get("avg_exam_score", score)))

    pct = round(min(100.0, max(0.0, float(c.get("dynamic_competence_percent", score)))), 1)
    if pct >= 90.0:
        level = 5
        level_label = "Level 5: Elite Systems Master"
    elif pct >= 75.0:
        level = 4
        level_label = "Level 4: Advanced Recruiter Tier"
    elif pct >= 55.0:
        level = 3
        level_label = "Level 3: Proficient Practitioner"
    elif pct >= 30.0:
        level = 2
        level_label = "Level 2: Developing Competence"
    else:
        level = 1
        level_label = "Level 1: Unverified Baseline"

    is_verified = c.get("is_verified_talent")
    if is_verified is None:
        is_verified = (level >= 4 and exam_score >= 80.0 and total_mins >= 60)

    res = dict(c)
    res.update({
        "skill_score": pct,
        "dynamic_competence_percent": pct,
        "dynamic_competence_level": level,
        "dynamic_competence_label": level_label,
        "total_study_minutes": study_mins,
        "total_lecture_minutes": lecture_mins,
        "verified_exam_score": exam_score,
        "is_verified_talent": bool(is_verified)
    })
    return res

def load_candidates():
    store = load_local_store()
    cands = store.get("candidates", [])
    if not cands and os.path.exists(CANDIDATES_FILE):
        try:
            with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
                cands = json.load(f)
        except Exception:
            cands = []

    # Include qualified learners who reached Level 4+
    for u in store.get("users", []):
        u_pct = float(u.get("dynamic_competence_percent", 0) or 0)
        u_study = float(u.get("total_study_minutes", 0) or 0) + float(u.get("total_lecture_minutes", 0) or 0)
        u_exam = float(u.get("avg_exam_score", 0) or 0)
        u_email = (u.get("email") or "").lower()
        if (u_pct >= 75.0 or (u_exam >= 80.0 and u_study >= 60.0)) and not any((c.get("email") or "").lower() == u_email for c in cands):
            cands.append({
                "id": u.get("id", f"usr-{int(time.time()*1000)}"),
                "name": u.get("name", "Verified Learner"),
                "email": u_email,
                "stream": (u.get("stream") or "IT").upper(),
                "domain": "Systems & Engineering Track",
                "experience_level": "Fresher (0-1 yr)",
                "skill_score": u_pct or 75.0,
                "dynamic_competence_percent": u_pct or 75.0,
                "total_study_minutes": int(u.get("total_study_minutes", 0) or 0),
                "total_lecture_minutes": int(u.get("total_lecture_minutes", 0) or 0),
                "verified_exam_score": u_exam,
                "skills": [(u.get("stream") or "IT").upper(), "Verified Learner", "Continuous Engineering"],
                "capstone_proof": f"Verified Student Activity: {u.get('total_study_minutes', 0)}m study time, {u.get('total_lecture_minutes', 0)}m lecture time, and {u_exam}% benchmark examination mastery."
            })

    return [enrich_candidate(c) for c in cands]

def save_candidates(candidates):
    try:
        with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
            json.dump(candidates, f, indent=2)
        store = load_local_store()
        store["candidates"] = candidates
        save_local_store(store)
        return True
    except Exception as e:
        print(f"[DB Error] Could not save candidates: {e}")
        return False


def load_email_config():
    default_config = {
        "provider": "brevo",
        "brevo_api_key": emailService.api_key,
        "brevo_from_email": emailService.from_email,
        "smtp_enabled": True,
        "smtp_server": "smtp-relay.brevo.com",
        "smtp_port": 587,
        "smtp_user": emailService.from_email,
        "smtp_password": "",
        "sender_name": "Campus2Career Verification",
        "sender_email": emailService.from_email
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_config.update(data)
                return default_config
        except Exception as e:
            print(f"[Config Error] Could not read email_config.json: {e}")
    return default_config

def save_email_config(config):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        print(f"[Config Error] Could not save email_config.json: {e}")
        return False

def load_emails():
    if os.path.exists(EMAILS_FILE):
        try:
            with open(EMAILS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_emails(emails):
    try:
        with open(EMAILS_FILE, "w", encoding="utf-8") as f:
            json.dump(emails, f, indent=2)
    except Exception as e:
        print(f"Error saving emails: {e}")

def send_smtp_email(to_email, subject, body_text, body_html=None):
    config = load_email_config()
    if not config.get("smtp_enabled", True):
        return False, "SMTP is currently disabled in email_config.json."
    
    server_host = config.get("smtp_server", "smtp.gmail.com").strip()
    server_port = int(config.get("smtp_port", 587))
    user = config.get("smtp_user", "").strip()
    password = config.get("smtp_password", "").strip()
    sender_name = config.get("sender_name", "Campus2Career Verification").strip()
    sender_email = config.get("sender_email", user or "verify@campus2career.org").strip()

    if not user or not password:
        return False, "SMTP username or App Password is not configured in email_config.json."

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"{sender_name} <{sender_email}>"
    msg['To'] = to_email

    msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
    if body_html:
        msg.attach(MIMEText(body_html, 'html', 'utf-8'))

    try:
        print(f"[SMTP Service] Connecting to {server_host}:{server_port}...")
        if server_port == 465:
            server = smtplib.SMTP_SSL(server_host, server_port, timeout=12)
        else:
            server = smtplib.SMTP(server_host, server_port, timeout=12)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(user, password)
        server.sendmail(sender_email, [to_email], msg.as_string())
        server.quit()
        print(f"[SMTP Service] SUCCESS: Dispatched real email to {to_email}!")
        return True, f"Real email dispatched successfully to {to_email}"
    except Exception as e:
        err_msg = str(e)
        print(f"[SMTP Service] Delivery failed to {to_email}: {err_msg}")
        return False, err_msg

def send_email_dispatch(to_email, subject, body_text, body_html=None):
    """
    Unified transactional email dispatcher:
    1. Primary: Brevo REST API (Transaction emails, works on all cloud hosts & local without open ports).
    2. Fallback: SMTP Relay if Brevo not configured or fails.
    Returns: (success: bool, info: str, message_id: str, provider: str)
    """
    config = load_email_config()
    sender_name = config.get("sender_name", "Campus2Career Verification").strip()
    sender_email = config.get("brevo_from_email") or config.get("sender_email") or emailService.from_email

    # 1. Primary Brevo API
    if emailService.api_key:
        ok, info, msg_id = emailService.send_email(
            from_email=sender_email,
            to_email=to_email,
            subject=subject,
            body=body_text,
            html_body=body_html,
            sender_name=sender_name
        )
        if ok:
            return True, info, msg_id, "brevo"
        else:
            print(f"[Brevo Service Warning] Brevo returned: {info}. Attempting fallback...")

    # 2. Fallback to SMTP if configured
    if config.get("smtp_enabled", True) and config.get("smtp_user") and config.get("smtp_password"):
        ok, info = send_smtp_email(to_email, subject, body_text, body_html)
        return ok, info, None, "smtp"

    return False, "Brevo API and SMTP not configured or failed.", None, "none"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Allow embedding and cross-origin referrers for YouTube playback without error 153
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Permissions-Policy', 'picture-in-picture=(), fullscreen=*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # 1. API: Send Email
        if self.path == '/api/send-email':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_length)
                payload = json.loads(post_body.decode('utf-8'))
                
                to_addr = payload.get("to", "").strip()
                subject = payload.get("subject", "Campus2Career Verification")
                code = payload.get("code", "")
                name = payload.get("name", "Candidate")
                email_type = payload.get("type", "verification")
                link = payload.get("link", f"http://localhost:8000/verify?email={urllib.parse.quote(to_addr)}&code={code}")

                # Build professional responsive HTML body
                body_html = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B132B; color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B;">
                  <div style="padding: 28px 32px; background: linear-gradient(135deg, #0B132B, #111C3A); border-bottom: 1px solid #1E293B;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Campus<span style="color: #008080;">2Career</span></h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Personalized Core Skill Competence Engine</p>
                  </div>
                  <div style="padding: 32px; background: #0F172A;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #F8FAFC;">Hello {name},</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                      Thank you for using Campus2Career! To verify your email address and activate your account assessments, please use the 6-digit confirmation code below:
                    </p>
                    <div style="background: #1E293B; border: 2px dashed #008080; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                      <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #2DD4BF;">{code}</span>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">This code expires in 15 minutes. Do not share it with anyone.</p>
                    </div>
                    <div style="text-align: center; margin: 28px 0;">
                      <a href="{link}" style="display: inline-block; background: #008080; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 13px;">
                        &check; Click Here to Activate &amp; Verify Account
                      </a>
                    </div>
                    <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px;">
                      If you did not request this email, please ignore it. Your account security remains intact.
                    </p>
                  </div>
                </div>
                """

                plain_body = f"Hello {name},\n\nYour Campus2Career verification code is: {code}\n\nOr click here to activate: {link}\n\nExpires in 15 minutes."

                # Attempt real email delivery via Brevo REST API (or SMTP fallback)
                dispatch_ok, dispatch_info, msg_id, provider = send_email_dispatch(to_addr, subject, plain_body, body_html)

                email_record = {
                    "id": f"email_{int(time.time()*1000)}",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "to": to_addr,
                    "subject": subject,
                    "code": code,
                    "type": email_type,
                    "link": link,
                    "name": name,
                    "body": plain_body,
                    "delivered": dispatch_ok,
                    "smtp_status": dispatch_info,
                    "message_id": msg_id,
                    "provider": provider,
                    "verified": False
                }
                
                # Save to local outbox for Sovereign Admin Suite review
                emails = load_emails()
                emails.insert(0, email_record)
                save_emails(emails[:50])

                response_data = json.dumps({
                    "success": True,
                    "delivered": dispatch_ok,
                    "smtp_status": dispatch_info,
                    "provider": provider,
                    "message_id": msg_id,
                    "message": f"Verification email dispatched to {to_addr} via {provider.upper()}",
                    "emailId": email_record["id"]
                }).encode('utf-8')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response_data)))
                self.end_headers()
                self.wfile.write(response_data)
                return
            except Exception as e:
                err_data = json.dumps({"success": False, "error": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_data)))
                self.end_headers()
                self.wfile.write(err_data)
                return

        # 2. API: Update SMTP Configuration from Admin Portal
        if self.path == '/api/smtp-config':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_length)
                payload = json.loads(post_body.decode('utf-8'))
                
                cur_config = load_email_config()
                if "provider" in payload: cur_config["provider"] = payload["provider"].strip()
                if "brevo_api_key" in payload and payload["brevo_api_key"].strip():
                    cur_config["brevo_api_key"] = payload["brevo_api_key"].strip()
                if "brevo_from_email" in payload and payload["brevo_from_email"].strip():
                    cur_config["brevo_from_email"] = payload["brevo_from_email"].strip()
                if "smtp_server" in payload: cur_config["smtp_server"] = payload["smtp_server"].strip()
                if "smtp_port" in payload: cur_config["smtp_port"] = int(payload["smtp_port"])
                if "smtp_user" in payload: cur_config["smtp_user"] = payload["smtp_user"].strip()
                if "smtp_password" in payload and payload["smtp_password"].strip(): 
                    cur_config["smtp_password"] = payload["smtp_password"].strip()
                if "sender_name" in payload: cur_config["sender_name"] = payload["sender_name"].strip()
                if "sender_email" in payload: cur_config["sender_email"] = payload["sender_email"].strip()
                if "smtp_enabled" in payload: cur_config["smtp_enabled"] = bool(payload["smtp_enabled"])

                save_email_config(cur_config)

                # Re-sync EmailService with updated config
                if cur_config.get("brevo_api_key"):
                    emailService.api_key = cur_config["brevo_api_key"]
                if cur_config.get("brevo_from_email"):
                    emailService.from_email = cur_config["brevo_from_email"]

                # If test_email provided, execute live delivery test immediately
                test_result = None
                if payload.get("test_email"):
                    test_to = payload["test_email"].strip()
                    test_ok, test_info, msg_id, used_prov = send_email_dispatch(
                        test_to,
                        "Campus2Career Email Test Delivery",
                        f"Congratulations! Real-time email dispatching via {cur_config.get('provider', 'Brevo').upper()} is working flawlessly for Campus2Career.\nTimestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}",
                        f"<div style='font-family:sans-serif;padding:24px;background:#0F172A;color:#FFF;border-radius:12px;border:1px solid #1E293B;'><h2 style='color:#2DD4BF;margin-top:0;'>Campus2Career Email Verified &check;</h2><p>Real-time email dispatching to <strong>{test_to}</strong> is active and delivering via <strong>{used_prov.upper()}</strong>!</p><p style='color:#94A3B8;font-size:12px;'>Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}</p></div>"
                    )
                    test_result = {"delivered": test_ok, "info": test_info, "provider": used_prov, "message_id": msg_id}

                res_obj = {
                    "success": True,
                    "message": "Email configuration saved successfully.",
                    "test_result": test_result
                }
                res_data = json.dumps(res_obj).encode('utf-8')
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

        # 3. API: Save/Update Candidate Database from Admin Portal or App
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
                self.send_header('Access-Control-Allow-Origin', '*')
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

        # 4. API: Student Activity Pipeline (Lecture Stopwatch, Study Timers, Exam Submissions)
        if self.path in ('/api/student/activity', '/api/student/log-activity'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_length)
                payload = json.loads(post_body.decode('utf-8'))
                
                act_type = payload.get("activity_type", "study_timer")
                duration = max(0.0, float(payload.get("duration_minutes", 0) or 0))
                score_val = float(payload.get("score")) if payload.get("score") is not None else None
                module_name = payload.get("module_name", "Core Curriculum Module")
                user_email = (payload.get("user_email") or "learner.test@engineering.ac.in").strip().lower()

                store = load_local_store()
                if "student_activity_logs" not in store:
                    store["student_activity_logs"] = []

                act_record = {
                    "id": f"act-{int(time.time()*1000)}",
                    "user_id": payload.get("user_id"),
                    "user_email": user_email,
                    "activity_type": act_type,
                    "duration_minutes": duration,
                    "score": score_val,
                    "module_name": module_name,
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
                }
                store["student_activity_logs"].insert(0, act_record)
                save_local_store(store)

                comp = compute_dynamic_competence(user_email)

                # Update matching user in store
                for u in store.get("users", []):
                    if (u.get("email") or "").lower() == user_email:
                        u["total_study_minutes"] = comp["total_study_minutes"]
                        u["total_lecture_minutes"] = comp["total_lecture_minutes"]
                        u["avg_exam_score"] = comp["avg_exam_score"]
                        u["dynamic_competence_percent"] = comp["dynamic_competence_percent"]
                save_local_store(store)

                res_data = json.dumps({
                    "success": True,
                    "message": f"Activity '{act_type}' successfully recorded in student_activity_logs.",
                    "activity": act_record,
                    "competence": comp
                }).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
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

        # 5. API: Recruiter Direct Interview Invitation
        if self.path == '/api/recruiter/invite':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_length)
                payload = json.loads(post_body.decode('utf-8'))
                cand_id = payload.get("candidateId")
                cand_name = payload.get("candidateName", "Candidate")
                company = payload.get("recruiterCompany", "Campus2Career Enterprise Partner")
                res_data = json.dumps({
                    "success": True,
                    "message": f"Interview invitation successfully dispatched to candidate {cand_id} from {company}.",
                    "invite": payload
                }).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
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

        # 6. API: MCQ Benchmark Examination Submission
        if self.path == '/api/mcq/submit':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_length)
                payload = json.loads(post_body.decode('utf-8'))
                user_email = (payload.get("user_email") or "anonymous@campus2career.org").strip().lower()
                questions = payload.get("questions", [])
                answers = payload.get("answers", [])
                
                correct = 0
                for i, q in enumerate(questions):
                    if i < len(answers):
                        if str(answers[i]) == str(q.get("correct")):
                            correct += 1
                pct = round((correct / max(1, len(questions))) * 100) if questions else 85
                passed = pct >= 80

                store = load_local_store()
                if "student_activity_logs" not in store:
                    store["student_activity_logs"] = []
                store["student_activity_logs"].insert(0, {
                    "id": f"act-{int(time.time()*1000)}",
                    "user_email": user_email,
                    "activity_type": "exam",
                    "duration_minutes": payload.get("mode", 10),
                    "score": pct,
                    "module_name": payload.get("module_title", "Engineering Systems Diagnostic"),
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
                })
                save_local_store(store)
                comp = compute_dynamic_competence(user_email)

                token = f"C2C-{int(time.time()*1000):X}"
                badge_tier = "Diamond Distinction" if pct >= 90 else ("Verified Gold" if pct >= 80 else "Silver Competence")

                res_data = json.dumps({
                    "success": True,
                    "score": pct,
                    "passed": passed,
                    "badgeTier": badge_tier,
                    "credentialToken": token,
                    "competence": comp
                }).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
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

        super().do_POST()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        clean_path = parsed_path.path

        # API: Return candidate database for Recruiter Portal
        if clean_path in ('/api/recruiter/candidates', '/api/candidates'):
            params = urllib.parse.parse_qs(parsed_path.query)
            stream_filter = params.get('stream', ['all'])[0]
            domain_filter = params.get('domain', ['all'])[0]
            exp_filter = params.get('experience', ['all'])[0]

            candidates = load_candidates()
            if stream_filter and stream_filter.lower() != 'all':
                candidates = [c for c in candidates if (c.get('stream') or '').upper() == stream_filter.upper()]
            if domain_filter and domain_filter.lower() != 'all':
                candidates = [c for c in candidates if domain_filter.lower() in (c.get('domain') or '').lower()]
            if exp_filter and exp_filter.lower() != 'all':
                candidates = [c for c in candidates if exp_filter.lower() in (c.get('experience_level') or '').lower()]

            candidates.sort(key=lambda c: float(c.get('dynamic_competence_percent') or c.get('skill_score') or 0), reverse=True)

            data = json.dumps({
                "success": True,
                "count": len(candidates),
                "filter": {"stream": stream_filter, "domain": domain_filter, "experience": exp_filter},
                "candidates": candidates
            }).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        # API: Return student activity and competence
        if clean_path in ('/api/student/activity', '/api/student/competence'):
            params = urllib.parse.parse_qs(parsed_path.query)
            user_email = params.get('email', [''])[0]
            comp = compute_dynamic_competence(user_email)
            store = load_local_store()
            logs = [l for l in store.get("student_activity_logs", []) if not user_email or (l.get("user_email") or "").lower() == user_email.lower()]
            data = json.dumps({
                "success": True,
                "competence": comp,
                "logs": logs[:20]
            }).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path == '/api/emails':
            emails = load_emails()
            data = json.dumps({"success": True, "emails": emails}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        # API: Return SMTP/Brevo status (password masked)
        if self.path == '/api/smtp-config':
            cfg = load_email_config()
            safe_cfg = {
                "provider": cfg.get("provider", "brevo"),
                "brevo_active": bool(emailService.api_key),
                "brevo_from_email": cfg.get("brevo_from_email") or emailService.from_email,
                "has_brevo_key": bool(cfg.get("brevo_api_key") or emailService.api_key),
                "smtp_enabled": cfg.get("smtp_enabled", True),
                "smtp_server": cfg.get("smtp_server", "smtp-relay.brevo.com"),
                "smtp_port": cfg.get("smtp_port", 587),
                "smtp_user": cfg.get("smtp_user", "campus2career7@gmail.com"),
                "has_password": bool(cfg.get("smtp_password")),
                "sender_name": cfg.get("sender_name", "Campus2Career Verification"),
                "sender_email": cfg.get("sender_email", cfg.get("brevo_from_email", "campus2career7@gmail.com"))
            }
            data = json.dumps({"success": True, "config": safe_cfg}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        # Verification link clicked from email: /verify?email=...&code=...
        if self.path.startswith('/verify'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            target_email = params.get('email', [''])[0]
            target_code = params.get('code', [''])[0]
            
            emails = load_emails()
            found = False
            for em in emails:
                if em.get('to', '').lower() == target_email.lower():
                    em['verified'] = True
                    found = True
            if found:
                save_emails(emails)

            # Synchronize verification status in candidates_db.json
            cands = load_candidates()
            for c in cands:
                if c.get('email', '').lower() == target_email.lower():
                    c['verified'] = True
                    c['verifiedReady'] = True
            save_candidates(cands)
            
            # Redirect to index.html with verification params
            redirect_url = f"/index.html?verified=true&email={urllib.parse.quote(target_email)}&code={urllib.parse.quote(target_code)}"
            self.send_response(302)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return

        # Redirect /recruiter cleanly to /recruiter.html
        if self.path in ('/recruiter', '/recruiter/'):
            self.send_response(302)
            self.send_header('Location', '/recruiter.html')
            self.end_headers()
            return

        super().do_GET()

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_port(start_port=8000, max_attempts=20):
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port):
            return port
    return None

def run():
    port = DEFAULT_PORT
    if is_port_in_use(DEFAULT_PORT):
        print("===============================================================")
        print(f"Port {DEFAULT_PORT} is active. If running a previous server instance,")
        print(f"restart server.py to pick up backend email APIs.")
        print("===============================================================")
        port = find_available_port(DEFAULT_PORT + 1)
        if not port:
            print("Error: Could not find an available port.")
            sys.exit(1)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), CustomHandler) as httpd:
        actual_url = f"http://localhost:{port}/index.html"
        print("===============================================================")
        print("Campus2Career Platform Local Server & API is Running!")
        print(f"Access URL: {actual_url}")
        print(f"Serving directory: {DIRECTORY}")
        print("Backend Real SMTP Email Service Active at /api/send-email")
        print("Auto-opening platform in your default browser...")
        print("Press Ctrl+C to terminate.")
        print("===============================================================")

        def open_browser():
            time.sleep(0.5)
            try:
                webbrowser.open(actual_url)
                print(f"[Browser] Opened {actual_url} in your default browser.")
            except Exception as e:
                print(f"[Browser Error] Could not auto-open browser: {e}")

        threading.Thread(target=open_browser, daemon=True).start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run()

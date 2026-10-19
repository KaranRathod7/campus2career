# -*- coding: utf-8 -*-
"""
Email Service for Campus2Career
Sends real transactional emails via Brevo (formerly Sendinblue) REST API.
Works out of the box on all cloud hosts (Render, Vercel, Railway, AWS, and local)
with zero mandatory pip dependencies.
"""
import os
import json
import urllib.request
import urllib.error
import urllib.parse
from Config import Config

# Optional SDK support if user installed sib_api_v3_sdk
try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    HAS_BREVO_SDK = True
except ImportError:
    HAS_BREVO_SDK = False

# Optional dotenv support
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False


class EmailService:
    def __init__(self, env_file="keys.env"):
        if HAS_DOTENV and os.path.exists(env_file):
            load_dotenv(env_file)
        
        email_config = Config.getEmailCred()
        self.api_key = email_config.get('BREVO_API_KEY', '').strip()
        self.from_email = email_config.get('BREVO_FROM_EMAIL', 'campus2career7@gmail.com').strip()
        self.username = self.from_email
        self.web_url = Config.VITE_WEB_PATH or Config.getOrigins()[0]

        # Configure Brevo SDK if available
        self._api_instance = None
        if HAS_BREVO_SDK and self.api_key:
            try:
                configuration = sib_api_v3_sdk.Configuration()
                configuration.api_key['api-key'] = self.api_key
                self._api_client = sib_api_v3_sdk.ApiClient(configuration)
                self._api_instance = sib_api_v3_sdk.TransactionalEmailsApi(self._api_client)
            except Exception as e:
                print(f"[EmailService] Notice: SDK init failed ({e}), using direct HTTP REST API.")

    def send_email(self, from_email=None, to_email=None, subject=None, body="", html_body=None, sender_name="Campus2Career Verification"):
        """
        Send a transactional email via Brevo.
        Uses Brevo SDK if available, with robust fallback to direct HTTP REST API.
        Returns: (success: bool, info: str, message_id: str)
        """
        sender_email = from_email or self.from_email or "campus2career7@gmail.com"
        target_email = to_email

        if not target_email or not subject:
            return False, "Missing recipient email or subject.", None

        if not self.api_key:
            return False, "Brevo API Key is missing. Check .env or email_config.json.", None

        # Build HTML content if not provided
        if not html_body:
            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B132B; color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B;">
              <div style="padding: 28px 32px; background: linear-gradient(135deg, #0B132B, #111C3A); border-bottom: 1px solid #1E293B;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Campus<span style="color: #008080;">2Career</span></h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Personalized Core Skill Competence Engine</p>
              </div>
              <div style="padding: 32px; background: #0F172A;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #F8FAFC;">{subject}</h2>
                <div style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1; white-space: pre-wrap;">
                  {body}
                </div>
                <div style="padding-top: 20px; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B;">
                  Dispatched via Brevo Transactional Email Engine &bull; Campus2Career Sovereign System
                </div>
              </div>
            </div>
            """

        # 1. Try Brevo SDK if available
        if self._api_instance:
            try:
                send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                    sender={"name": sender_name, "email": sender_email},
                    to=[{"email": target_email}],
                    subject=subject,
                    text_content=body,
                    html_content=html_body
                )
                response = self._api_instance.send_transac_email(send_smtp_email)
                msg_id = getattr(response, 'message_id', str(response))
                print(f"[Brevo SDK] Email sent successfully to {target_email}. Message ID: {msg_id}")
                return True, f"Dispatched via Brevo SDK (ID: {msg_id})", msg_id
            except Exception as e:
                print(f"[Brevo SDK Warning] SDK call failed ({e}), falling back to direct REST API...")

        # 2. Direct HTTP REST API via urllib.request (Zero dependencies, guaranteed to work)
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            payload = {
                "sender": {"name": sender_name, "email": sender_email},
                "to": [{"email": target_email}],
                "subject": subject,
                "textContent": body,
                "htmlContent": html_body
            }
            data_bytes = json.dumps(payload).encode("utf-8")
            headers = {
                "api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Campus2Career-Brevo-Client/1.0"
            }
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=15) as res:
                res_body = res.read().decode("utf-8")
                res_json = json.loads(res_body)
                msg_id = res_json.get("messageId", "ok")
                print(f"[Brevo REST API] SUCCESS: Dispatched email to {target_email}! Message ID: {msg_id}")
                return True, f"Dispatched via Brevo API (ID: {msg_id})", msg_id

        except urllib.error.HTTPError as http_err:
            try:
                err_content = http_err.read().decode("utf-8")
                err_json = json.loads(err_content)
                err_msg = err_json.get("message", err_content)
            except Exception:
                err_msg = str(http_err)
            print(f"[Brevo API Error] HTTP {http_err.code}: {err_msg}")
            return False, f"Brevo API error: {err_msg}", None
        except Exception as e:
            print(f"[Brevo API Error] Exception sending email: {e}")
            return False, f"Error sending email: {str(e)}", None

    def createLink(self, to_api="auth", endpoint="register", param=""):
        """
        Creates a unique link for verification.
        ?ref is used to track the unique otp in the link.
        """
        return f"{self.web_url}/{to_api}/{endpoint}{param}"


# Global instance matching user's architecture
emailService = EmailService()

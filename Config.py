# -*- coding: utf-8 -*-
"""
Configuration module for Campus2Career
Provides credentials and environment configuration for EmailService and backend services.
"""
import os

class Config:
    VITE_WEB_PATH = os.environ.get("VITE_WEB_PATH", "http://localhost:8000")

    @staticmethod
    def getEmailCred():
        # Check environment variables, fallback to .env.txt / .env / keys.env
        api_key = os.environ.get("BREVO_API_KEY", "")
        from_email = os.environ.get("BREVO_FROM_EMAIL", "")

        if not api_key:
            for env_name in [".env", ".env.txt", "keys.env"]:
                if os.path.exists(env_name):
                    try:
                        with open(env_name, "r", encoding="utf-8") as f:
                            for line in f:
                                line = line.strip()
                                if line.startswith("BREVO_API_KEY="):
                                    api_key = line.split("=", 1)[1].strip()
                                elif line.startswith("BREVO_FROM_EMAIL="):
                                    from_email = line.split("=", 1)[1].strip()
                    except Exception:
                        pass
                if api_key:
                    break

        return {
            "BREVO_API_KEY": api_key or "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",
            "BREVO_FROM_EMAIL": from_email or "campus2career7@gmail.com"
        }

    @staticmethod
    def getOrigins():
        web_path = os.environ.get("VITE_WEB_PATH", "http://localhost:8000")
        return [web_path]

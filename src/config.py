import os
from dotenv import load_dotenv

load_dotenv()

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

DB_PATH = os.getenv("DB_PATH", "recovery.db")

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

TWILIO_SID = os.getenv("TWILIO_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

SENDGRID_KEY = os.getenv("SENDGRID_KEY", "")
SENDGRID_FROM = os.getenv("SENDGRID_FROM", "")

_REQUIRED_LIVE = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]

def validate():
    if not DEMO_MODE:
        missing = [k for k in _REQUIRED_LIVE if not os.getenv(k)]
        if missing:
            raise RuntimeError(f"Missing required env vars (DEMO_MODE=false): {', '.join(missing)}")

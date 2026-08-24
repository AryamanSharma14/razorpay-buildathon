"""Claude-generated explainable nudge + multi-channel dispatch."""
import json

import httpx

from src import config, db

_TEMPLATE_MSG = "Your recent payment failed. Please retry using this secure link: {url}"
_TEMPLATE_REASON = "template (no LLM)"

AMOUNT_HUMAN_READABLE = {
    "insufficient_funds": "insufficient funds",
    "payment_timeout": "a timeout",
    "do_not_honor": "a bank restriction",
    "issuer_down": "a temporary bank outage",
    "gateway_error": "a gateway error",
    "payment_failed": "an error",
}


def generate_message(event: dict, link_url: str) -> dict:
    if not config.ANTHROPIC_API_KEY:
        return {
            "message": _TEMPLATE_MSG.format(url=link_url),
            "reasoning": _TEMPLATE_REASON,
        }

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

        reason_human = AMOUNT_HUMAN_READABLE.get(
            event.get("error_reason", ""), event.get("error_reason", "an error")
        )
        amount_inr = (event.get("amount_paise") or 0) / 100

        prompt = f"""A customer's payment of INR {amount_inr:.0f} failed due to {reason_human}.
Generate a recovery message to send via WhatsApp/SMS/email encouraging them to retry.
Retry link: {link_url}

Respond in JSON with exactly two keys:
- "message": short customer-facing nudge (empathetic, no technical jargon, under 160 chars, include the link)
- "reasoning": one line explaining why this framing was chosen (for audit/explainability)

JSON only, no markdown."""

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        data = json.loads(text)
        return {
            "message": str(data.get("message", _TEMPLATE_MSG.format(url=link_url))),
            "reasoning": str(data.get("reasoning", "Claude-generated")),
        }
    except Exception as e:
        return {
            "message": _TEMPLATE_MSG.format(url=link_url),
            "reasoning": f"template (LLM error: {type(e).__name__})",
        }


def _send_whatsapp(event: dict, message: str) -> bool:
    if not all([config.TWILIO_SID, config.TWILIO_AUTH_TOKEN, config.TWILIO_WHATSAPP_FROM]):
        return False
    contact = event.get("contact", "")
    if not contact:
        return False
    try:
        resp = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{config.TWILIO_SID}/Messages.json",
            auth=(config.TWILIO_SID, config.TWILIO_AUTH_TOKEN),
            data={
                "From": config.TWILIO_WHATSAPP_FROM,
                "To": f"whatsapp:{contact}",
                "Body": message,
            },
            timeout=10,
        )
        return resp.status_code in (200, 201)
    except Exception:
        return False


def _send_email(event: dict, message: str) -> bool:
    if not all([config.SENDGRID_KEY, config.SENDGRID_FROM]):
        return False
    email = event.get("email", "")
    if not email:
        return False
    try:
        resp = httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {config.SENDGRID_KEY}"},
            json={
                "personalizations": [{"to": [{"email": email}]}],
                "from": {"email": config.SENDGRID_FROM},
                "subject": "Your payment failed — retry here",
                "content": [{"type": "text/plain", "value": message}],
            },
            timeout=10,
        )
        return resp.status_code == 202
    except Exception:
        return False


def send(event: dict, link_url: str) -> str:
    pid = event.get("payment_id", "")
    result = generate_message(event, link_url)
    message = result["message"]
    reasoning = result["reasoning"]

    llm_or_template = "template" if "template" in reasoning else "claude"
    db.log_audit(pid, "nudge_generated", llm_or_template)

    channel = "mock"
    if _send_whatsapp(event, message):
        channel = "whatsapp"
    elif _send_email(event, message):
        channel = "email"
    else:
        channel = "whatsapp(mock)" if not config.TWILIO_SID else "email(mock)"

    db.update_event(
        pid,
        nudge_channel=channel,
        nudge_message=message,
        nudge_reasoning=reasoning,
    )
    db.log_audit(pid, "nudge_sent", channel)
    return channel

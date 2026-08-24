"""Claude-generated nudge + multi-channel dispatch. Stub — Stage 5."""
from src import db


def generate_message(event: dict, link_url: str) -> dict:
    return {
        "message": f"Your payment failed. Retry here: {link_url}",
        "reasoning": "template (no LLM)",
    }


def send(event: dict, link_url: str) -> str:
    result = generate_message(event, link_url)
    pid = event.get("payment_id", "")
    db.update_event(pid, nudge_channel="mock", nudge_message=result["message"],
                    nudge_reasoning=result["reasoning"])
    db.log_audit(pid, "nudge_sent", "mock(stub)")
    db.log_audit(pid, "nudge_generated", "template (no LLM)")
    return "mock"

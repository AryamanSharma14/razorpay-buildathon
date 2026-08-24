"""Fire a test payment.failed webhook to localhost for dev/demo."""
import argparse
import json
import time
import httpx

PRESETS = {
    "soft": {
        "error_source": "bank",
        "error_step": "payment_authorization",
        "error_reason": "insufficient_funds",
    },
    "hard": {
        "error_source": "customer",
        "error_step": "payment_authentication",
        "error_reason": "card_expired",
    },
}


def build_payload(source, step, reason, amount):
    pid = f"pay_test_{int(time.time())}"
    return {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": pid,
                    "order_id": f"order_{pid}",
                    "amount": amount,
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "international": False,
                    "email": "test@example.com",
                    "contact": "+919999999999",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment failed",
                    "error_source": source,
                    "error_step": step,
                    "error_reason": reason,
                    "created_at": int(time.time()),
                }
            }
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", choices=["soft", "hard"], default=None)
    parser.add_argument("--reason", default="insufficient_funds")
    parser.add_argument("--source", default="bank")
    parser.add_argument("--step", default="payment_authorization")
    parser.add_argument("--amount", type=int, default=50000)
    parser.add_argument("--url", default="http://localhost:8000/webhook/razorpay?skip_sig=1")
    args = parser.parse_args()

    if args.preset:
        p = PRESETS[args.preset]
        source, step, reason = p["error_source"], p["error_step"], p["error_reason"]
    else:
        source, step, reason = args.source, args.step, args.reason

    payload = build_payload(source, step, reason, args.amount)
    print(f"Firing {args.preset or 'custom'} webhook: {reason} ({source})")

    r = httpx.post(args.url, json=payload)
    print(f"Response: {r.status_code} — {r.text}")


if __name__ == "__main__":
    main()

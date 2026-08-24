from unittest.mock import patch, MagicMock
from src import nudge, config


def _event():
    return {
        "payment_id": "pay_test_001",
        "amount_paise": 50000,
        "error_reason": "insufficient_funds",
        "email": "test@example.com",
        "contact": "+919999999999",
    }


def test_no_api_key_uses_template():
    orig = config.ANTHROPIC_API_KEY
    config.ANTHROPIC_API_KEY = ""
    try:
        with patch("src.db.log_audit"), patch("src.db.update_event"):
            result = nudge.generate_message(_event(), "https://rzp.io/i/test")
        assert "template" in result["reasoning"].lower()
        assert "https://rzp.io/i/test" in result["message"]
    finally:
        config.ANTHROPIC_API_KEY = orig


def test_llm_path_stores_message():
    mock_client = MagicMock()
    mock_content = MagicMock()
    mock_content.text = '{"message": "Retry here: https://rzp.io/i/test", "reasoning": "empathy"}'
    mock_client.messages.create.return_value = MagicMock(content=[mock_content])

    orig = config.ANTHROPIC_API_KEY
    config.ANTHROPIC_API_KEY = "sk-test"
    try:
        with patch("anthropic.Anthropic", return_value=mock_client):
            result = nudge.generate_message(_event(), "https://rzp.io/i/test")
        assert result["message"] == "Retry here: https://rzp.io/i/test"
        assert result["reasoning"] == "empathy"
    finally:
        config.ANTHROPIC_API_KEY = orig


def test_send_never_raises():
    orig = config.ANTHROPIC_API_KEY
    config.ANTHROPIC_API_KEY = ""
    try:
        with patch("src.db.log_audit"), patch("src.db.update_event"):
            channel = nudge.send(_event(), "https://rzp.io/i/test")
        assert channel  # returns something
    finally:
        config.ANTHROPIC_API_KEY = orig


def test_dispatch_priority_whatsapp_first():
    orig_key = config.ANTHROPIC_API_KEY
    config.ANTHROPIC_API_KEY = ""
    try:
        with patch("src.nudge._send_whatsapp", return_value=True) as mock_wa, \
             patch("src.nudge._send_email", return_value=True) as mock_email, \
             patch("src.db.log_audit"), patch("src.db.update_event"):
            channel = nudge.send(_event(), "https://rzp.io/i/test")
        mock_wa.assert_called_once()
        mock_email.assert_not_called()
        assert channel == "whatsapp"
    finally:
        config.ANTHROPIC_API_KEY = orig_key


def test_dispatch_falls_through_to_email():
    orig_key = config.ANTHROPIC_API_KEY
    config.ANTHROPIC_API_KEY = ""
    try:
        with patch("src.nudge._send_whatsapp", return_value=False), \
             patch("src.nudge._send_email", return_value=True) as mock_email, \
             patch("src.db.log_audit"), patch("src.db.update_event"):
            channel = nudge.send(_event(), "https://rzp.io/i/test")
        mock_email.assert_called_once()
        assert channel == "email"
    finally:
        config.ANTHROPIC_API_KEY = orig_key

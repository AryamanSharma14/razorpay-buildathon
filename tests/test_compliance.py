from unittest.mock import patch

from src import compliance


def _card(network="Visa", iin="411111", issuer="HDFC"):
    return {"payment_id": "pay_c1", "method": "card", "card_network": network,
            "card_iin": iin, "card_issuer": issuer}


def test_non_card_rail_is_not_network_capped():
    allowed, why = compliance.check_retry_allowed({"payment_id": "p", "method": "upi"})
    assert allowed and "non-card" in why


def test_credential_key_falls_back_to_payment_id_without_iin():
    assert compliance.credential_of({"payment_id": "p1", "method": "card"}) == "pid:p1"


def test_visa_allows_under_twenty_in_thirty_days():
    with patch("src.db.count_network_attempts", return_value=19), \
         patch("src.db.last_attempt_ts", return_value=None):
        assert compliance.check_retry_allowed(_card())[0] is True


def test_visa_blocks_at_twenty_in_thirty_days():
    with patch("src.db.count_network_attempts", return_value=20):
        allowed, why = compliance.check_retry_allowed(_card())
        assert not allowed and "20/20" in why


def test_mastercard_blocks_on_ten_per_24h():
    with patch("src.db.count_network_attempts", return_value=10):
        allowed, why = compliance.check_retry_allowed(_card(network="MasterCard"))
        assert not allowed and "24h" in why


def test_unknown_network_uses_strict_default_cap():
    with patch("src.db.count_network_attempts", return_value=10):
        assert compliance.check_retry_allowed(_card(network=None))[0] is False


def test_recovery_blocked_when_cap_reached():
    from src.recovery import run_recovery
    event = {**_card(), "classification": "soft", "recovered": 0,
             "merchant_cancelled": 0, "attempts": 0, "amount_paise": 50000}
    with patch("src.db.get_event", return_value=event), \
         patch("src.db.log_audit") as audit, \
         patch("src.db.count_network_attempts", return_value=20), \
         patch("src.db.last_attempt_ts", return_value=None), \
         patch("src.recovery.create_payment_link") as link:
        run_recovery("pay_c1")
        assert not link.called
        assert "network_cap_block" in [c[0][1] for c in audit.call_args_list]

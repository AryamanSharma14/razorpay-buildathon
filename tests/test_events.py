import asyncio
import json
import src.events as ev_mod


def setup_function():
    ev_mod._bus.clear()


def test_push_adds_to_bus():
    ev_mod.push("payment_failed", "pay_1", {"amount_paise": 10000})
    assert len(ev_mod._bus) == 1
    e = ev_mod._bus[0]
    assert e["type"] == "payment_failed"
    assert e["payment_id"] == "pay_1"
    assert e["detail"]["amount_paise"] == 10000
    assert "ts" in e


def test_bus_caps_at_max_and_drops_oldest():
    for i in range(ev_mod._MAX_BUS + 5):
        ev_mod.push("t", f"p_{i}")
    assert len(ev_mod._bus) == ev_mod._MAX_BUS
    assert ev_mod._bus[-1]["payment_id"] == f"p_{ev_mod._MAX_BUS + 4}"
    assert ev_mod._bus[0]["payment_id"] == "p_5"


def test_push_empty_detail_defaults_to_empty_dict():
    ev_mod.push("hard_blocked", "pay_x")
    assert ev_mod._bus[0]["detail"] == {}


def test_stream_yields_last_20_on_connect():
    for i in range(30):
        ev_mod.push("t", f"p_{i}")

    async def collect():
        results = []
        async for chunk in ev_mod._generate():
            results.append(chunk)
            if len(results) == 20:
                break
        return results

    chunks = asyncio.run(collect())
    assert len(chunks) == 20
    first = json.loads(chunks[0].replace("data: ", "").strip())
    assert first["payment_id"] == "p_10"

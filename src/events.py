import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

_bus: list[dict] = []
_MAX_BUS = 500

router = APIRouter()


def push(event_type: str, payment_id: str, detail: dict | None = None) -> None:
    _bus.append({
        "type": event_type,
        "payment_id": payment_id,
        "ts": datetime.now(timezone.utc).isoformat(),
        "detail": detail or {},
    })
    if len(_bus) > _MAX_BUS:
        _bus.pop(0)  # ponytail: O(n) pop fine at 500-cap demo scale


def bus_size() -> int:
    return len(_bus)


def clear() -> None:
    _bus.clear()


async def _generate():
    pos = max(0, len(_bus) - 20)  # send last 20 on connect, then stream new
    while True:
        while pos < len(_bus):
            yield f"data: {json.dumps(_bus[pos])}\n\n"
            pos += 1
        await asyncio.sleep(0.3)


@router.get("/events/stream")
async def stream():
    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

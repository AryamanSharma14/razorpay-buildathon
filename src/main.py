from fastapi import FastAPI
from src import config, db
from src.webhook import router as webhook_router
from src.dashboard import router as dashboard_router
from src import scheduler as sched

app = FastAPI(title="Decline-Aware Recovery Orchestrator")


@app.on_event("startup")
def startup():
    config.validate()
    db.init_db()
    sched.load_model()
    sched.scheduler.start()

@app.on_event("shutdown")
def shutdown():
    sched.scheduler.shutdown(wait=False)

@app.get("/ping")
def ping():
    return {"status": "ok", "demo_mode": config.DEMO_MODE}


app.include_router(webhook_router)
# dashboard_router is included last: it owns the SPA catch-all GET /{full_path:path}
app.include_router(dashboard_router)

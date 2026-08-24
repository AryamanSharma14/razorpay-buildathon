from fastapi import FastAPI
from src import config, db
from src.webhook import router as webhook_router
from src.dashboard import router as dashboard_router
from src import scheduler as sched

app = FastAPI(title="Decline-Aware Recovery Orchestrator")
app.include_router(webhook_router)
app.include_router(dashboard_router)

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
    return {"status": "ok"}

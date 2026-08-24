from fastapi import FastAPI
from src import config, db
from src.webhook import router as webhook_router

app = FastAPI(title="Decline-Aware Recovery Orchestrator")
app.include_router(webhook_router)

@app.on_event("startup")
def startup():
    config.validate()
    db.init_db()

@app.get("/ping")
def ping():
    return {"status": "ok"}

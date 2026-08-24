from fastapi import FastAPI
from src import config, db

app = FastAPI(title="Decline-Aware Recovery Orchestrator")

@app.on_event("startup")
def startup():
    config.validate()
    db.init_db()

@app.get("/ping")
def ping():
    return {"status": "ok"}

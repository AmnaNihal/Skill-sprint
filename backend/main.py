from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from routers import auth, documents, plans, reports, roles

settings = get_settings()

app = FastAPI(
    title="SkillSprint AI API",
    version="1.0.0",
    description="Generative AI + Python dual-pipeline onboarding intelligence backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(roles.router)
app.include_router(plans.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "skillsprint-api"}

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import hcps, interactions, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Run seed if DB is empty
    from .seed import seed
    await seed()
    yield
    # Shutdown — nothing special needed


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-First CRM HCP Module – LogInteraction API powered by LangGraph + Groq",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(hcps.router)
app.include_router(interactions.router)
app.include_router(chat.router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to the CRM HCP Module API",
        "docs": "/docs",
        "health": "/health",
    }

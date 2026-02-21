# AI-First CRM HCP Module 🏥🤖

An AI-first Customer Relationship Management system for pharmaceutical field representatives to manage Healthcare Professional (HCP) interactions. Built with **LangGraph + Groq AI**, **React + Redux**, and **FastAPI**.

---

## 📸 Architecture Overview

```
┌──────────────────────────────────┐         ┌──────────────────────────────────────┐
│         Frontend (React)         │  HTTP/  │          Backend (FastAPI)            │
│  ┌─────────────────────────────┐ │  SSE    │  ┌──────────────────────────────┐   │
│  │   LogInteractionScreen      │ │◄───────►│  │  LangGraph ReAct Agent       │   │
│  │  ┌──────────┐ ┌──────────┐  │ │         │  │  (Groq gemma2-9b-it)         │   │
│  │  │ Struct.  │ │   Chat   │  │ │         │  │                              │   │
│  │  │  Form    │ │Interface │  │ │         │  │  Tools:                      │   │
│  │  └──────────┘ └──────────┘  │ │         │  │  1. log_interaction          │   │
│  └─────────────────────────────┘ │         │  │  2. edit_interaction         │   │
│  ┌─────────────────────────────┐ │         │  │  3. search_hcp               │   │
│  │  Redux Store                │ │         │  │  4. get_interaction_history  │   │
│  │  • interactionsSlice        │ │         │  │  5. generate_next_best_action│   │
│  │  • chatSlice (SSE stream)   │ │         │  └──────────────────────────────┘   │
│  │  • hcpSlice                 │ │         │  ┌──────────────────────────────┐   │
│  └─────────────────────────────┘ │         │  │  REST API (FastAPI)          │   │
└──────────────────────────────────┘         │  │  /api/hcps /interactions     │   │
                                             │  │  /api/chat  /api/chat/stream │   │
                                             │  └──────────────────────────────┘   │
                                             │  ┌──────────────────────────────┐   │
                                             │  │  Database (SQLite / Postgres) │   │
                                             │  │  Tables: hcps, interactions  │   │
                                             │  │          chat_sessions        │   │
                                             │  └──────────────────────────────┘   │
                                             └──────────────────────────────────────┘
```

---

## 🔑 LangGraph Agent & Tools

The LangGraph **ReAct agent** (`backend/app/agent/agent.py`) uses Groq's **gemma2-9b-it** model to intelligently handle HCP interaction management. It maintains per-session memory via `MemorySaver`.

### Tool 1: `log_interaction`
Captures a new interaction with an HCP. The LLM **auto-extracts**:
- Sentiment (positive / neutral / negative) + score
- Products discussed
- Objections raised
- Next steps
- Generates a professional AI summary from raw notes

### Tool 2: `edit_interaction`
Modifies an existing logged interaction by ID. If raw notes are updated, the LLM **re-runs enrichment** to regenerate the summary and sentiment.

### Tool 3: `search_hcp`
Fuzzy search HCPs by name, specialty, territory, or institution. Returns matching records from the database.

### Tool 4: `get_interaction_history`
Retrieves the last N interactions for a specified HCP (by name or ID), formatted with dates, sentiment, products, and next steps.

### Tool 5: `generate_next_best_action`
Analyzes the last 5 interactions with an HCP and uses the LLM to generate a **personalized Next Best Action** recommendation including:
- Immediate action within 1 week
- Key talking points
- Products to focus on
- How to address prior objections
- 1–3 month relationship strategy

---

## 🚀 Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com))

---

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server (auto-creates DB + seeds HCPs)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will:
1. Auto-create all database tables on startup
2. Seed 10 sample HCPs from Indian hospitals
3. Be available at `http://localhost:8000`
4. Interactive API docs at `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend available at `http://localhost:5173`

---

### Environment Variables (`.env`)

| Variable | Description | Required |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key | ✅ Yes |
| `DATABASE_URL` | DB connection string | No (defaults to SQLite) |
| `CORS_ORIGINS` | Allowed frontend origins | No |
| `DEBUG` | Enable SQL logging | No |

**SQLite (default, no server needed):**
```
DATABASE_URL=sqlite+aiosqlite:///./crm_hcp.db
```

**PostgreSQL:**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/crm_hcp
```

---

## 📁 Project Structure

```
crm-hcp-module/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, CORS
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── models.py            # HCP, Interaction, ChatSession ORM
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── seed.py              # Sample HCP data seeder
│   │   ├── agent/
│   │   │   ├── agent.py         # LangGraph ReAct graph + Groq LLM
│   │   │   └── tools.py         # 5 LangGraph tools
│   │   └── routers/
│   │       ├── hcps.py          # GET/POST /api/hcps
│   │       ├── interactions.py  # CRUD /api/interactions
│   │       └── chat.py          # POST /api/chat + /api/chat/stream (SSE)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # App shell + Router
│   │   ├── index.css            # Global dark design system
│   │   ├── store/
│   │   │   ├── index.js         # Redux configureStore
│   │   │   ├── hcpSlice.js      # HCP state
│   │   │   ├── interactionsSlice.js  # Interaction CRUD state
│   │   │   └── chatSlice.js     # Chat + streaming state
│   │   ├── services/
│   │   │   └── api.js           # Axios client + SSE stream helper
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── HCPSelector.jsx
│   │   │   ├── StructuredForm.jsx
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── InteractionHistory.jsx
│   │   │   └── EditInteractionModal.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       └── LogInteractionScreen.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🔗 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/hcps/` | List / search HCPs |
| POST | `/api/hcps/` | Create HCP |
| GET | `/api/hcps/{id}` | Get single HCP |
| GET | `/api/interactions/` | List interactions |
| POST | `/api/interactions/` | Log interaction (form) |
| PUT | `/api/interactions/{id}` | Update interaction |
| DELETE | `/api/interactions/{id}` | Delete interaction |
| POST | `/api/chat/` | Chat with agent (JSON) |
| POST | `/api/chat/stream` | Chat with agent (SSE streaming) |
| GET | `/api/chat/new-session` | Generate new session ID |

---

## 🧪 Demonstration Script (for video)

1. **Log Interaction (Tool 1)** – Chat: *"Log my meeting with Dr. Priya Sharma today about Metformin XR — very positive, she agreed to prescribe"*
2. **Edit Interaction (Tool 2)** – Chat: *"Edit interaction 1 — add next step: send follow-up brochure by Friday"*
3. **Search HCP (Tool 3)** – Chat: *"Search for cardiologists in the North territory"*
4. **Get History (Tool 4)** – Chat: *"Show me all my interactions with Dr. Arjun Mehta"*
5. **Next Best Action (Tool 5)** – Chat: *"What should I do next with Dr. Sneha Reddy?"*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Redux Toolkit, React Router 6 |
| Styling | Vanilla CSS (Google Inter font) |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI Agent | LangGraph (ReAct agent), MemorySaver |
| LLM | Groq `gemma2-9b-it` (via langchain-groq) |
| Database | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy async |
| Streaming | Server-Sent Events (SSE) for real-time token streaming |

---

## 📝 License

MIT – Built for the AI-First CRM Assignment, Round 1.

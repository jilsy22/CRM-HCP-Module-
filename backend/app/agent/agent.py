"""
LangGraph ReAct agent for the HCP CRM system.
Uses Groq's gemma2-9b-it model with session-level agent caching.
"""

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from ..config import settings
from .tools import ALL_TOOLS, set_dependencies

# Module-level cache: thread_id -> agent instance
# This avoids recreating the LLM + agent on every request
_agent_cache: dict = {}
_memory = MemorySaver()

# Known HCPs in the seeded database (helps the model avoid hallucinating names)
KNOWN_HCPS = """
Known HCPs in the database:
1. Dr. Priya Sharma      – Cardiology,     North territory,   Apollo Hospitals
2. Dr. Arjun Mehta       – Oncology,       West territory,    Kokilaben Hospital
3. Dr. Sneha Reddy       – Endocrinology,  South territory,   Manipal Hospital
4. Dr. Vikram Bose       – Neurology,      East territory,    Fortis Healthcare
5. Dr. Ananya Nair       – Pulmonology,    South territory,   Aster Medcity
6. Dr. Rajesh Kumar      – Diabetology,    North territory,   Max Super Specialty
7. Dr. Meera Pillai      – Rheumatology,   West territory,    Hinduja Hospital
8. Dr. Suresh Patel      – Nephrology,     Central territory, Medanta - The Medicity
9. Dr. Kavitha Ranganathan – Hematology,  South territory,   CMC Vellore
10. Dr. Ashok Gupta      – Gastroenterology, North territory, AIIMS Delhi
"""

SYSTEM_PROMPT = f"""You are an intelligent AI assistant for a pharmaceutical field sales representative.
You help them manage relationships with Healthcare Professionals (HCPs) efficiently.

{KNOWN_HCPS}

Your 5 tools and when to use each:
1. **search_hcp** — Search HCPs by name, specialty, territory, or institution. Use this FIRST when the user mentions a doctor to confirm exact spelling and get the ID.
2. **log_interaction** — Log a new interaction. Use the exact HCP name from the database. Extract: type, notes, products, location, duration.
3. **edit_interaction** — Update an existing interaction by its numeric ID. Only update the fields the user mentions.
4. **get_interaction_history** — Retrieve past interactions for an HCP. Use name or ID.
5. **generate_next_best_action** — Analyze history and give a prioritized action plan for an HCP.

Rules:
- Always use the HCP's exact name as it appears in the database.
- If unsure of the HCP name, call search_hcp to confirm before calling log_interaction.
- When a user describes a meeting or call, proactively call log_interaction.
- Be concise and professional. Format responses with line breaks and bullet points.
- Use pharmaceutical CRM terminology: HCP, territory, detailing, objection handling, etc.
- Today's date: you are assisting a field rep with their daily CRM tasks."""


def create_agent(db_session):
    """
    Return a LangGraph ReAct agent.
    The same agent instance is reused across requests via module-level cache
    (MemorySaver already holds conversation history per thread_id).
    """
    global _agent_cache

    # Return cached agent if available (db session is re-injected every time)
    cache_key = "default"
    if cache_key in _agent_cache:
        # Re-inject the current db session into tools
        llm = _agent_cache[cache_key]["llm"]
        set_dependencies(db_session, llm)
        return _agent_cache[cache_key]["agent"]

    # First-time setup
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=settings.GROQ_API_KEY,
        temperature=0.2,
        max_tokens=2048,
    )

    set_dependencies(db_session, llm)

    agent = create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        checkpointer=_memory,
        prompt=SystemMessage(content=SYSTEM_PROMPT),
    )

    _agent_cache[cache_key] = {"agent": agent, "llm": llm}
    return agent

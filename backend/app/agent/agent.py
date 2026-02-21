"""
LangGraph ReAct agent for the HCP CRM system.
Uses Groq's gemma2-9b-it model.
"""

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from ..config import settings
from .tools import ALL_TOOLS, set_dependencies

# System prompt for the field rep AI agent
SYSTEM_PROMPT = """You are an intelligent AI assistant for a pharmaceutical field sales representative.
You help them manage relationships with Healthcare Professionals (HCPs) efficiently.

Your capabilities:
1. **log_interaction** – Log new interactions with HCPs. You use AI to auto-extract sentiment, products, objections, and next steps from raw notes.
2. **edit_interaction** – Edit or update a previously logged interaction by its ID.
3. **search_hcp** – Search for HCPs by name, specialty, territory, or institution.
4. **get_interaction_history** – Retrieve past interaction history for any HCP.
5. **generate_next_best_action** – Analyze interaction history and recommend the best next action for a specific HCP.

Guidelines:
- Be concise, professional, and helpful.
- When the user describes a meeting or call, proactively use log_interaction.
- If asked to find a doctor, use search_hcp first, then use the result.
- Always confirm before editing (unless the user explicitly asked to edit).
- Format responses clearly with bullet points when listing data.
- Use life sciences terminology appropriately (HCP, territory, detailing, NPI, etc.).
- Today's date context: you are helping a field rep manage their daily CRM tasks.

Start by understanding the user's intent and calling the appropriate tool."""


def create_agent(db_session):
    """Create and return a LangGraph ReAct agent with DB session injected."""
    
    # Inject DB and LLM into tools module
    llm = ChatGroq(
        model="gemma2-9b-it",
        api_key=settings.GROQ_API_KEY,
        temperature=0.3,
        max_tokens=2048,
    )
    
    set_dependencies(db_session, llm)
    
    # Create a ReAct agent with memory
    memory = MemorySaver()
    
    agent = create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        checkpointer=memory,
        state_modifier=SystemMessage(content=SYSTEM_PROMPT),
    )
    
    return agent

"""
LangGraph Tools for the HCP CRM Agent.

Five tools:
  1. log_interaction   – captures & enriches interaction data via LLM
  2. edit_interaction  – modifies an existing logged interaction
  3. search_hcp        – fuzzy search HCPs by name / specialty / territory
  4. get_interaction_history – retrieves past interactions for a given HCP
  5. generate_next_best_action – LLM-powered recommendation for next steps
"""

import json
import re
from datetime import datetime
from typing import Optional
from langchain_core.tools import tool

# Shared DB session injected at runtime (set by agent.py)
_db_session = None
_llm = None


def set_dependencies(db_session, llm):
    global _db_session, _llm
    _db_session = db_session
    _llm = llm


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from LLM output.
    Handles:
      - Plain JSON strings
      - JSON wrapped in markdown code fences (```json ... ```)
      - Leading/trailing whitespace
    """
    text = text.strip()
    # Strip markdown code fences if present
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    # Find first { ... } block
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        text = brace_match.group(0)
    return json.loads(text)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1: Log Interaction
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def log_interaction(
    hcp_name: str,
    interaction_type: str,
    notes: str,
    products_discussed: Optional[str] = None,
    location: Optional[str] = None,
    duration_minutes: Optional[int] = None,
) -> str:
    """
    Log a new interaction with a Healthcare Professional (HCP).
    Uses the LLM to auto-extract sentiment, key entities (products, objections,
    next steps) from the raw notes and generates a structured summary.

    Args:
        hcp_name: Full name of the HCP (used to lookup in DB)
        interaction_type: Type such as 'In-Person Visit', 'Phone Call', 'Email', 'Webinar', 'Conference'
        notes: Raw notes from the interaction (free text)
        products_discussed: Comma-separated product names (optional, LLM will also extract)
        location: Physical location or platform used
        duration_minutes: Duration of the meeting in minutes
    """
    from sqlalchemy import select
    from ..models import HCP, Interaction, InteractionType

    db = _db_session
    llm = _llm

    # 1. Find HCP
    result = await db.execute(
        select(HCP).where(HCP.name.ilike(f"%{hcp_name}%"))
    )
    hcp = result.scalars().first()

    if not hcp:
        return (
            f"❌ HCP '{hcp_name}' not found in the database.\n"
            f"Tip: Use search_hcp to find the correct name first."
        )

    # 2. Use LLM to enrich the raw notes
    enrichment_prompt = f"""You are an AI assistant for a pharmaceutical field representative CRM system.
Analyze the following interaction notes and extract structured information.

HCP Name: {hcp.name}
Specialty: {hcp.specialty}
Interaction Type: {interaction_type}
Raw Notes: {notes}

Extract and return a JSON object with exactly these keys:
- "summary": A concise 2-3 sentence professional summary of the interaction
- "sentiment": One of "positive", "neutral", or "negative"
- "sentiment_score": A float between -1.0 (very negative) and 1.0 (very positive)
- "products_discussed": A list of pharmaceutical products or brands mentioned
- "objections_raised": A list of any objections or concerns raised by the HCP
- "next_steps": A brief description of recommended next steps
- "samples_provided": A list of samples given to the HCP (if any)

Return ONLY valid JSON with no markdown formatting, no code fences, no explanation."""

    llm_response = await llm.ainvoke(enrichment_prompt)

    try:
        enriched = _extract_json(llm_response.content)
    except (json.JSONDecodeError, ValueError):
        enriched = {
            "summary": notes[:300],
            "sentiment": "neutral",
            "sentiment_score": 0.0,
            "products_discussed": [],
            "objections_raised": [],
            "next_steps": "Follow up with HCP as appropriate.",
            "samples_provided": [],
        }

    # Merge manually provided products
    if products_discussed:
        extra = [p.strip() for p in products_discussed.split(",")]
        enriched["products_discussed"] = list(set(enriched.get("products_discussed", []) + extra))

    # 3. Map interaction type
    type_map = {
        "in-person visit": InteractionType.IN_PERSON_VISIT,
        "in person visit": InteractionType.IN_PERSON_VISIT,
        "phone call": InteractionType.PHONE_CALL,
        "email": InteractionType.EMAIL,
        "webinar": InteractionType.WEBINAR,
        "conference": InteractionType.CONFERENCE,
    }
    mapped_type = type_map.get(interaction_type.lower(), InteractionType.OTHER)

    # 4. Create Interaction record
    interaction = Interaction(
        hcp_id=hcp.id,
        interaction_type=mapped_type,
        interaction_date=datetime.utcnow(),
        duration_minutes=duration_minutes,
        location=location,
        raw_notes=notes,
        ai_summary=enriched.get("summary", ""),
        sentiment=enriched.get("sentiment", "neutral"),
        sentiment_score=enriched.get("sentiment_score", 0.0),
        products_discussed=enriched.get("products_discussed", []),
        objections_raised=enriched.get("objections_raised", []),
        next_steps=enriched.get("next_steps", ""),
        samples_provided=enriched.get("samples_provided", []),
    )
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)

    products_str = ", ".join(enriched.get("products_discussed", [])) or "None"
    objections_str = ", ".join(enriched.get("objections_raised", [])) or "None"

    return (
        f"✅ Interaction logged successfully!\n"
        f"  - ID: {interaction.id}\n"
        f"  - HCP: {hcp.name} ({hcp.specialty})\n"
        f"  - Type: {mapped_type.value}\n"
        f"  - Sentiment: {enriched.get('sentiment', 'neutral')} (score: {enriched.get('sentiment_score', 0.0):.2f})\n"
        f"  - Summary: {enriched.get('summary', '')}\n"
        f"  - Products: {products_str}\n"
        f"  - Objections: {objections_str}\n"
        f"  - Next Steps: {enriched.get('next_steps', 'None')}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2: Edit Interaction
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def edit_interaction(
    interaction_id: int,
    raw_notes: Optional[str] = None,
    next_steps: Optional[str] = None,
    products_discussed: Optional[str] = None,
    location: Optional[str] = None,
    duration_minutes: Optional[int] = None,
    follow_up_date: Optional[str] = None,
) -> str:
    """
    Edit / update an existing logged HCP interaction by its ID.
    Only provide the fields you want to change — others remain unchanged.
    If raw_notes are updated, the AI automatically re-generates the summary and sentiment.

    Args:
        interaction_id: The numeric ID of the interaction to edit
        raw_notes: Updated free-text notes (triggers AI re-summarization if provided)
        next_steps: Updated next steps text
        products_discussed: Updated comma-separated product names
        location: Updated location
        duration_minutes: Updated duration
        follow_up_date: Follow-up date string (ISO format: YYYY-MM-DD)
    """
    from sqlalchemy import select
    from ..models import Interaction

    db = _db_session
    llm = _llm

    result = await db.execute(select(Interaction).where(Interaction.id == interaction_id))
    interaction = result.scalars().first()

    if not interaction:
        return f"❌ Interaction with ID {interaction_id} not found."

    updates = []

    if raw_notes is not None:
        interaction.raw_notes = raw_notes
        updates.append("raw_notes")

        # Re-run AI enrichment on updated notes
        re_enrich_prompt = f"""You are a pharmaceutical CRM AI assistant.
Re-analyze the following updated interaction notes.

Raw Notes: {raw_notes}

Return a JSON object with exactly these keys:
- "summary": 2-3 sentence professional summary
- "sentiment": "positive", "neutral", or "negative"
- "sentiment_score": float between -1.0 and 1.0

Return ONLY valid JSON with no markdown formatting and no code fences."""

        llm_response = await llm.ainvoke(re_enrich_prompt)
        try:
            enriched = _extract_json(llm_response.content)
            interaction.ai_summary = enriched.get("summary", interaction.ai_summary)
            interaction.sentiment = enriched.get("sentiment", interaction.sentiment)
            interaction.sentiment_score = enriched.get("sentiment_score", interaction.sentiment_score)
            updates.append("ai_summary + sentiment")
        except (json.JSONDecodeError, ValueError):
            pass  # Keep existing summary if LLM fails

    if next_steps is not None:
        interaction.next_steps = next_steps
        updates.append("next_steps")

    if products_discussed is not None:
        interaction.products_discussed = [p.strip() for p in products_discussed.split(",")]
        updates.append("products_discussed")

    if location is not None:
        interaction.location = location
        updates.append("location")

    if duration_minutes is not None:
        interaction.duration_minutes = duration_minutes
        updates.append("duration_minutes")

    if follow_up_date is not None:
        try:
            interaction.follow_up_date = datetime.strptime(follow_up_date, "%Y-%m-%d")
            updates.append("follow_up_date")
        except ValueError:
            return f"❌ Invalid follow_up_date format. Use YYYY-MM-DD (e.g., 2025-03-15)."

    interaction.updated_at = datetime.utcnow()
    await db.commit()

    if updates:
        return (
            f"✅ Interaction #{interaction_id} updated successfully!\n"
            f"  - Fields changed: {', '.join(updates)}\n"
            f"  - Updated summary: {interaction.ai_summary or 'N/A'}\n"
            f"  - Sentiment: {interaction.sentiment or 'N/A'}\n"
            f"  - Next Steps: {interaction.next_steps or 'N/A'}"
        )
    else:
        return f"ℹ️ No fields were provided to update for Interaction #{interaction_id}."


# ─────────────────────────────────────────────────────────────────────────────
# Tool 3: Search HCP
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def search_hcp(
    name: Optional[str] = None,
    specialty: Optional[str] = None,
    territory: Optional[str] = None,
    institution: Optional[str] = None,
) -> str:
    """
    Search for Healthcare Professionals (HCPs) in the database.
    You can search by name, specialty, territory, or institution.
    At least one search parameter must be provided.
    Returns HCP IDs that can be used in other tools.

    Args:
        name: Partial name of the HCP (case-insensitive)
        specialty: Medical specialty (e.g., 'Cardiology', 'Oncology')
        territory: Sales territory name (e.g., 'North', 'South')
        institution: Hospital or clinic name
    """
    from sqlalchemy import select, or_
    from ..models import HCP

    if not any([name, specialty, territory, institution]):
        return "❌ Please provide at least one search parameter (name, specialty, territory, or institution)."

    db = _db_session
    query = select(HCP)
    filters = []

    if name:
        filters.append(HCP.name.ilike(f"%{name}%"))
    if specialty:
        filters.append(HCP.specialty.ilike(f"%{specialty}%"))
    if territory:
        filters.append(HCP.territory.ilike(f"%{territory}%"))
    if institution:
        filters.append(HCP.institution.ilike(f"%{institution}%"))

    query = query.where(or_(*filters)).limit(10)
    result = await db.execute(query)
    hcps = result.scalars().all()

    if not hcps:
        return "🔍 No HCPs found matching the given criteria."

    lines = [f"🔍 Found {len(hcps)} HCP(s):\n"]
    for hcp in hcps:
        lines.append(
            f"  • [ID: {hcp.id}] {hcp.name}\n"
            f"    Specialty: {hcp.specialty} | Territory: {hcp.territory or 'N/A'}\n"
            f"    Institution: {hcp.institution or 'N/A'} | Phone: {hcp.phone or 'N/A'}"
        )
    lines.append("\nYou can use the ID or name in log_interaction, get_interaction_history, or generate_next_best_action.")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 4: Get Interaction History
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def get_interaction_history(
    hcp_name: Optional[str] = None,
    hcp_id: Optional[int] = None,
    limit: int = 5,
) -> str:
    """
    Retrieve past interaction history for a specific HCP.
    Provide either the HCP's name or their database ID.

    Args:
        hcp_name: Name of the HCP (partial match supported)
        hcp_id: Numeric ID of the HCP
        limit: Maximum number of recent interactions to return (default 5)
    """
    from sqlalchemy import select
    from ..models import HCP, Interaction

    if not hcp_name and not hcp_id:
        return "❌ Please provide either hcp_name or hcp_id."

    db = _db_session

    # Resolve HCP
    if hcp_id:
        result = await db.execute(select(HCP).where(HCP.id == hcp_id))
    else:
        result = await db.execute(select(HCP).where(HCP.name.ilike(f"%{hcp_name}%")))

    hcp = result.scalars().first()
    if not hcp:
        return "❌ HCP not found with the given criteria."

    # Get interactions
    result = await db.execute(
        select(Interaction)
        .where(Interaction.hcp_id == hcp.id)
        .order_by(Interaction.interaction_date.desc())
        .limit(limit)
    )
    interactions = result.scalars().all()

    if not interactions:
        return f"ℹ️ No interactions found for {hcp.name}."

    lines = [f"📋 Last {len(interactions)} interaction(s) with {hcp.name} ({hcp.specialty}):\n"]
    for ix in interactions:
        itype = ix.interaction_type.value if ix.interaction_type else "Unknown"
        idate = ix.interaction_date.strftime("%Y-%m-%d") if ix.interaction_date else "N/A"
        products = ", ".join(ix.products_discussed or []) or "None"
        objections = ", ".join(ix.objections_raised or []) or "None"
        lines.append(
            f"  ─ [ID: {ix.id}] {itype} on {idate}\n"
            f"    Sentiment: {ix.sentiment or 'N/A'} (score: {ix.sentiment_score:.2f})\n"
            f"    Products: {products}\n"
            f"    Objections: {objections}\n"
            f"    Summary: {ix.ai_summary or ix.raw_notes or 'No notes'}\n"
            f"    Next Steps: {ix.next_steps or 'None'}"
        ) if ix.sentiment_score is not None else lines.append(
            f"  ─ [ID: {ix.id}] {itype} on {idate}\n"
            f"    Sentiment: {ix.sentiment or 'N/A'}\n"
            f"    Products: {products}\n"
            f"    Objections: {objections}\n"
            f"    Summary: {ix.ai_summary or ix.raw_notes or 'No notes'}\n"
            f"    Next Steps: {ix.next_steps or 'None'}"
        )
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 5: Generate Next Best Action
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def generate_next_best_action(
    hcp_name: Optional[str] = None,
    hcp_id: Optional[int] = None,
) -> str:
    """
    Analyze the interaction history for an HCP and use the LLM to generate
    intelligent, personalized next best action recommendations for the field rep.
    This tool reads the full history and provides a prioritized action plan.

    Args:
        hcp_name: Name of the HCP (partial match supported)
        hcp_id: Numeric ID of the HCP
    """
    from sqlalchemy import select
    from ..models import HCP, Interaction

    if not hcp_name and not hcp_id:
        return "❌ Please provide either hcp_name or hcp_id."

    db = _db_session
    llm = _llm

    # Resolve HCP
    if hcp_id:
        result = await db.execute(select(HCP).where(HCP.id == hcp_id))
    else:
        result = await db.execute(select(HCP).where(HCP.name.ilike(f"%{hcp_name}%")))

    hcp = result.scalars().first()
    if not hcp:
        return "❌ HCP not found."

    # Get recent interactions
    result = await db.execute(
        select(Interaction)
        .where(Interaction.hcp_id == hcp.id)
        .order_by(Interaction.interaction_date.desc())
        .limit(5)
    )
    interactions = result.scalars().all()

    if not interactions:
        return (
            f"ℹ️ No interaction history found for {hcp.name} ({hcp.specialty}) at {hcp.institution or 'N/A'}.\n\n"
            f"🎯 Recommendation: Schedule an introductory in-person visit to:\n"
            f"  1. Introduce yourself and your product portfolio\n"
            f"  2. Learn about the HCP's current treatment approach\n"
            f"  3. Leave relevant clinical materials\n"
            f"  4. Set up a follow-up call within 2 weeks"
        )

    # Prepare context for LLM
    history_text = "\n".join([
        f"- [{ix.interaction_date.strftime('%Y-%m-%d') if ix.interaction_date else 'N/A'}] "
        f"{ix.interaction_type.value if ix.interaction_type else 'Unknown'}: "
        f"{ix.ai_summary or ix.raw_notes or 'No notes'} | "
        f"Sentiment: {ix.sentiment or 'unknown'} | "
        f"Products: {', '.join(ix.products_discussed or []) or 'None'} | "
        f"Objections: {', '.join(ix.objections_raised or []) or 'None'} | "
        f"Next Steps: {ix.next_steps or 'None'}"
        for ix in interactions
    ])

    nba_prompt = f"""You are an expert pharmaceutical sales coach AI for a field representative.

HCP Profile:
- Name: {hcp.name}
- Specialty: {hcp.specialty}
- Territory: {hcp.territory or 'Unknown'}
- Institution: {hcp.institution or 'Unknown'}

Recent Interaction History:
{history_text}

Based on this history, provide a concise, actionable Next Best Action plan.
Format your response as a numbered list with exactly these 5 sections:
1. Recommended immediate action (within 1 week)
2. Key talking points for the next visit
3. Products to focus on and why
4. How to address prior objections
5. Long-term relationship strategy (1-3 months)

Be specific, practical, and empathetic to the HCP's needs."""

    llm_response = await llm.ainvoke(nba_prompt)

    return (
        f"🎯 Next Best Action for {hcp.name} ({hcp.specialty}):\n\n"
        f"{llm_response.content}"
    )


# Export all tools as a list
ALL_TOOLS = [
    log_interaction,
    edit_interaction,
    search_hcp,
    get_interaction_history,
    generate_next_best_action,
]

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Interaction, HCP
from ..schemas import InteractionCreate, InteractionUpdate, InteractionResponse

router = APIRouter(prefix="/api/interactions", tags=["Interactions"])


@router.get("/", response_model=List[InteractionResponse])
async def list_interactions(
    hcp_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List interactions, optionally filtered by HCP."""
    query = (
        select(Interaction)
        .options(selectinload(Interaction.hcp))
        .order_by(Interaction.interaction_date.desc())
    )
    if hcp_id:
        query = query.where(Interaction.hcp_id == hcp_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{interaction_id}", response_model=InteractionResponse)
async def get_interaction(interaction_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single interaction."""
    result = await db.execute(
        select(Interaction)
        .options(selectinload(Interaction.hcp))
        .where(Interaction.id == interaction_id)
    )
    interaction = result.scalars().first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.post("/", response_model=InteractionResponse, status_code=201)
async def create_interaction(
    data: InteractionCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new interaction (structured form submission)."""
    # Verify HCP exists
    hcp_result = await db.execute(select(HCP).where(HCP.id == data.hcp_id))
    if not hcp_result.scalars().first():
        raise HTTPException(status_code=404, detail="HCP not found")

    interaction_data = data.model_dump()
    if not interaction_data.get("interaction_date"):
        interaction_data["interaction_date"] = datetime.utcnow()

    interaction = Interaction(**interaction_data)
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)

    # Reload with HCP
    result = await db.execute(
        select(Interaction)
        .options(selectinload(Interaction.hcp))
        .where(Interaction.id == interaction.id)
    )
    return result.scalars().first()


@router.put("/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(
    interaction_id: int,
    data: InteractionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing interaction."""
    result = await db.execute(
        select(Interaction)
        .options(selectinload(Interaction.hcp))
        .where(Interaction.id == interaction_id)
    )
    interaction = result.scalars().first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interaction, field, value)

    interaction.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(interaction)

    result = await db.execute(
        select(Interaction)
        .options(selectinload(Interaction.hcp))
        .where(Interaction.id == interaction_id)
    )
    return result.scalars().first()


@router.delete("/{interaction_id}", status_code=204)
async def delete_interaction(interaction_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an interaction."""
    result = await db.execute(select(Interaction).where(Interaction.id == interaction_id))
    interaction = result.scalars().first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    await db.delete(interaction)
    await db.commit()

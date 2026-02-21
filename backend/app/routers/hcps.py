from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional

from ..database import get_db
from ..models import HCP
from ..schemas import HCPCreate, HCPResponse

router = APIRouter(prefix="/api/hcps", tags=["HCPs"])


@router.get("/", response_model=List[HCPResponse])
async def list_hcps(
    search: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    territory: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all HCPs with optional filtering."""
    query = select(HCP)
    filters = []

    if search:
        filters.append(
            or_(
                HCP.name.ilike(f"%{search}%"),
                HCP.institution.ilike(f"%{search}%"),
            )
        )
    if specialty:
        filters.append(HCP.specialty.ilike(f"%{specialty}%"))
    if territory:
        filters.append(HCP.territory.ilike(f"%{territory}%"))

    if filters:
        query = query.where(or_(*filters))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{hcp_id}", response_model=HCPResponse)
async def get_hcp(hcp_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single HCP by ID."""
    result = await db.execute(select(HCP).where(HCP.id == hcp_id))
    hcp = result.scalars().first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@router.post("/", response_model=HCPResponse, status_code=201)
async def create_hcp(hcp_data: HCPCreate, db: AsyncSession = Depends(get_db)):
    """Create a new HCP."""
    hcp = HCP(**hcp_data.model_dump())
    db.add(hcp)
    await db.commit()
    await db.refresh(hcp)
    return hcp


@router.delete("/{hcp_id}", status_code=204)
async def delete_hcp(hcp_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an HCP."""
    result = await db.execute(select(HCP).where(HCP.id == hcp_id))
    hcp = result.scalars().first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    await db.delete(hcp)
    await db.commit()

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from .models import InteractionType


# ─── HCP Schemas ────────────────────────────────────────────────────────────

class HCPBase(BaseModel):
    name: str
    specialty: str
    territory: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    institution: Optional[str] = None
    npi_number: Optional[str] = None


class HCPCreate(HCPBase):
    pass


class HCPResponse(HCPBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Interaction Schemas ─────────────────────────────────────────────────────

class InteractionBase(BaseModel):
    hcp_id: int
    interaction_type: InteractionType = InteractionType.IN_PERSON_VISIT
    interaction_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    raw_notes: Optional[str] = None
    products_discussed: Optional[List[str]] = Field(default_factory=list)
    next_steps: Optional[str] = None
    objections_raised: Optional[List[str]] = Field(default_factory=list)
    samples_provided: Optional[List[str]] = Field(default_factory=list)
    follow_up_date: Optional[datetime] = None


class InteractionCreate(InteractionBase):
    pass


class InteractionUpdate(BaseModel):
    interaction_type: Optional[InteractionType] = None
    interaction_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    raw_notes: Optional[str] = None
    products_discussed: Optional[List[str]] = None
    next_steps: Optional[str] = None
    objections_raised: Optional[List[str]] = None
    samples_provided: Optional[List[str]] = None
    follow_up_date: Optional[datetime] = None
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = None


class InteractionResponse(InteractionBase):
    id: int
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    hcp: Optional[HCPResponse] = None

    class Config:
        from_attributes = True


# ─── Chat Schemas ────────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str
    hcp_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    session_id: str
    response: str
    tool_calls: Optional[List[Any]] = None


class ToolCallInfo(BaseModel):
    tool_name: str
    tool_input: dict
    tool_output: Any

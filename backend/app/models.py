import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Enum,
    ForeignKey, JSON, Float
)
from sqlalchemy.orm import relationship
from .database import Base


class InteractionType(str, enum.Enum):
    IN_PERSON_VISIT = "In-Person Visit"
    PHONE_CALL = "Phone Call"
    EMAIL = "Email"
    WEBINAR = "Webinar"
    CONFERENCE = "Conference"
    OTHER = "Other"


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    specialty = Column(String(100), nullable=False)
    territory = Column(String(100), nullable=True)
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    institution = Column(String(200), nullable=True)
    npi_number = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    interactions = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<HCP id={self.id} name={self.name}>"


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=False)
    interaction_type = Column(Enum(InteractionType), nullable=False, default=InteractionType.IN_PERSON_VISIT)
    interaction_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    duration_minutes = Column(Integer, nullable=True)
    location = Column(String(200), nullable=True)
    raw_notes = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    products_discussed = Column(JSON, nullable=True, default=list)
    sentiment = Column(String(20), nullable=True)  # positive / neutral / negative
    sentiment_score = Column(Float, nullable=True)
    next_steps = Column(Text, nullable=True)
    objections_raised = Column(JSON, nullable=True, default=list)
    samples_provided = Column(JSON, nullable=True, default=list)
    follow_up_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hcp = relationship("HCP", back_populates="interactions")

    def __repr__(self):
        return f"<Interaction id={self.id} hcp_id={self.hcp_id} type={self.interaction_type}>"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    messages = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<ChatSession session_id={self.session_id}>"

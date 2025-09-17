from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/meeting_notes.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer, default=0)  # in seconds
    device_info = Column(Text, nullable=True)
    retention_enabled = Column(Boolean, default=True)
    deleted_at = Column(DateTime, nullable=True)

class Speaker(Base):
    __tablename__ = "speakers"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    speaker_id = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    color = Column(String, default="#3B82F6")
    notes = Column(Text, nullable=True)

class Segment(Base):
    __tablename__ = "segments"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    start_time = Column(Integer, nullable=False)  # in milliseconds
    end_time = Column(Integer, nullable=False)    # in milliseconds
    speaker_id = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    confidence = Column(Integer, default=0)  # 0-100

class Summary(Base):
    __tablename__ = "summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    tldr = Column(Text, nullable=True)
    key_topics = Column(Text, nullable=True)  # JSON string
    meeting_type = Column(String, nullable=True)
    processed_at = Column(DateTime, default=datetime.utcnow)

class ActionItem(Base):
    __tablename__ = "action_items"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    task = Column(Text, nullable=False)
    owner = Column(String, nullable=False)
    due_date = Column(String, nullable=True)  # YYYY-MM-DD or TBD
    priority = Column(String, nullable=True)  # high, medium, low
    context = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class FollowUp(Base):
    __tablename__ = "follow_ups"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    urgency = Column(String, nullable=True)  # high, medium, low
    context = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Risk(Base):
    __tablename__ = "risks"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    risk_description = Column(Text, nullable=False)
    impact = Column(String, nullable=True)  # high, medium, low
    likelihood = Column(String, nullable=True)  # high, medium, low
    mitigation = Column(Text, nullable=True)
    status = Column(String, default="open")  # open, mitigated, closed
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

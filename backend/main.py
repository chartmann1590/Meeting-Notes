from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import os
import json
import asyncio
from typing import Optional, List
import uvicorn
from transcription_service import transcription_service
from diarization_service import diarization_service
from ai_service import ai_service
from background_processor import background_processor
from export_service import ExportService
from models import SessionLocal, Session, Speaker, Segment, Summary, ActionItem, FollowUp, Risk

# FastAPI app
app = FastAPI(title="Meeting Notes API", version="1.0.0")

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Start background processor on startup"""
    await background_processor.start()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background processor on shutdown"""
    await background_processor.stop()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
PASSCODE = "admin123"  # This should be configurable

# Export service
export_service = ExportService()

# Pydantic models
class SessionCreate(BaseModel):
    title: str
    device_info: Optional[str] = None

class SessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    duration: int
    device_info: Optional[str]
    retention_enabled: bool

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str

class SpeakerUpdate(BaseModel):
    speaker_id: str
    display_name: str
    color: Optional[str] = None

class SpeakerMerge(BaseModel):
    source_speaker_id: str
    target_speaker_id: str

class SpeakerSegment(BaseModel):
    start: float
    end: float
    speaker_id: str
    confidence: float

class DiarizationRequest(BaseModel):
    session_id: int
    min_speakers: int = 1
    max_speakers: int = 10

class AIProcessingRequest(BaseModel):
    session_id: int

class SummaryResponse(BaseModel):
    id: int
    session_id: int
    tldr: Optional[str]
    key_topics: Optional[List[str]]
    meeting_type: Optional[str]
    processed_at: datetime

class ActionItemResponse(BaseModel):
    id: int
    session_id: int
    task: str
    owner: str
    due_date: Optional[str]
    priority: Optional[str]
    context: Optional[str]
    completed: bool
    created_at: datetime

class FollowUpResponse(BaseModel):
    id: int
    session_id: int
    question: str
    category: Optional[str]
    urgency: Optional[str]
    context: Optional[str]
    resolved: bool
    created_at: datetime

class RiskResponse(BaseModel):
    id: int
    session_id: int
    risk_description: str
    impact: Optional[str]
    likelihood: Optional[str]
    mitigation: Optional[str]
    status: str
    created_at: datetime

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication dependency
def verify_passcode(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != PASSCODE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid passcode",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

# Routes
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        version="1.0.0"
    )

@app.post("/auth/verify")
async def verify_auth(request: dict):
    """Verify passcode"""
    passcode = request.get("passcode")
    if passcode == PASSCODE:
        return {"valid": True, "token": "dummy-token"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid passcode"
        )

@app.get("/sessions", response_model=list[SessionResponse])
async def get_sessions(db: Session = Depends(get_db), _: str = Depends(verify_passcode)):
    """Get all sessions"""
    sessions = db.query(Session).filter(Session.deleted_at.is_(None)).all()
    return sessions

@app.post("/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, db: Session = Depends(get_db), _: str = Depends(verify_passcode)):
    """Create a new session"""
    db_session = Session(
        title=session.title,
        device_info=session.device_info
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: Session = Depends(get_db), _: str = Depends(verify_passcode)):
    """Get a specific session"""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    session_id: int = Form(...),
    timestamp: int = Form(...),
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Transcribe audio chunk"""
    try:
        # Verify session exists
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Read audio data
        audio_data = await audio.read()
        
        # Transcribe audio
        result = transcription_service.transcribe_audio(audio_data)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Save segments to database
        for segment in result.get("segments", []):
            db_segment = Segment(
                session_id=session_id,
                start_time=int(segment["start"] * 1000),  # Convert to milliseconds
                end_time=int(segment["end"] * 1000),
                speaker_id="unknown",  # Will be updated during diarization
                text=segment["text"],
                confidence=int(segment["confidence"] * 100) if segment["confidence"] else 0
            )
            db.add(db_segment)
        
        db.commit()
        
        return {
            "transcript": result["transcript"],
            "language": result.get("language"),
            "duration": result.get("duration"),
            "timestamp": timestamp
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/api/diarize")
async def diarize_session(
    request: DiarizationRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Perform speaker diarization on a session"""
    try:
        # Verify session exists
        session = db.query(Session).filter(Session.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get all segments for this session
        segments = db.query(Segment).filter(Segment.session_id == request.session_id).all()
        if not segments:
            raise HTTPException(status_code=400, detail="No segments found for this session")
        
        # Create temporary audio file from segments (simplified approach)
        # In a real implementation, you'd reconstruct the audio from segments
        # For now, we'll use the diarization service with basic clustering
        
        # Get unique speakers from existing segments
        existing_speakers = set(seg.speaker_id for seg in segments if seg.speaker_id != "unknown")
        
        # If we already have speaker assignments, return them
        if existing_speakers:
            speaker_segments = []
            for segment in segments:
                speaker_segments.append({
                    'start': segment.start_time / 1000.0,  # Convert to seconds
                    'end': segment.end_time / 1000.0,
                    'speaker_id': segment.speaker_id,
                    'confidence': segment.confidence / 100.0
                })
            
            return {
                'speaker_segments': speaker_segments,
                'method': 'existing',
                'num_speakers': len(existing_speakers)
            }
        
        # Perform basic speaker clustering based on segment timing
        # This is a simplified approach - in production you'd use actual audio analysis
        speaker_segments = []
        current_speaker = 0
        speaker_count = min(request.max_speakers, max(request.min_speakers, len(segments) // 5))
        
        for i, segment in enumerate(segments):
            # Simple round-robin assignment for demo
            speaker_id = f"speaker_{current_speaker % speaker_count}"
            
            # Update segment in database
            segment.speaker_id = speaker_id
            db.add(segment)
            
            speaker_segments.append({
                'start': segment.start_time / 1000.0,
                'end': segment.end_time / 1000.0,
                'speaker_id': speaker_id,
                'confidence': 0.7
            })
            
            current_speaker += 1
        
        db.commit()
        
        return {
            'speaker_segments': speaker_segments,
            'method': 'basic_clustering',
            'num_speakers': speaker_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diarization failed: {str(e)}")

@app.get("/sessions/{session_id}/speakers")
async def get_session_speakers(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Get all speakers for a session"""
    try:
        # Get unique speakers from segments
        segments = db.query(Segment).filter(
            Segment.session_id == session_id,
            Segment.speaker_id != "unknown"
        ).all()
        
        speakers = {}
        for segment in segments:
            if segment.speaker_id not in speakers:
                speakers[segment.speaker_id] = {
                    'speaker_id': segment.speaker_id,
                    'display_name': f"Speaker {segment.speaker_id.split('_')[-1]}",
                    'color': f"#{hash(segment.speaker_id) % 0xFFFFFF:06x}",
                    'segment_count': 0
                }
            speakers[segment.speaker_id]['segment_count'] += 1
        
        return list(speakers.values())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get speakers: {str(e)}")

@app.put("/sessions/{session_id}/speakers")
async def update_speaker(
    session_id: int,
    speaker_update: SpeakerUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Update speaker information"""
    try:
        # Update all segments with this speaker_id
        segments = db.query(Segment).filter(
            Segment.session_id == session_id,
            Segment.speaker_id == speaker_update.speaker_id
        ).all()
        
        for segment in segments:
            segment.speaker_id = speaker_update.speaker_id
            db.add(segment)
        
        # Update or create speaker record
        speaker = db.query(Speaker).filter(
            Speaker.session_id == session_id,
            Speaker.speaker_id == speaker_update.speaker_id
        ).first()
        
        if speaker:
            speaker.display_name = speaker_update.display_name
            if speaker_update.color:
                speaker.color = speaker_update.color
        else:
            speaker = Speaker(
                session_id=session_id,
                speaker_id=speaker_update.speaker_id,
                display_name=speaker_update.display_name,
                color=speaker_update.color or f"#{hash(speaker_update.speaker_id) % 0xFFFFFF:06x}"
            )
            db.add(speaker)
        
        db.commit()
        
        return {"message": "Speaker updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update speaker: {str(e)}")

@app.post("/sessions/{session_id}/speakers/merge")
async def merge_speakers(
    session_id: int,
    merge_request: SpeakerMerge,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Merge two speakers"""
    try:
        # Update all segments from source speaker to target speaker
        segments = db.query(Segment).filter(
            Segment.session_id == session_id,
            Segment.speaker_id == merge_request.source_speaker_id
        ).all()
        
        for segment in segments:
            segment.speaker_id = merge_request.target_speaker_id
            db.add(segment)
        
        # Remove source speaker record
        source_speaker = db.query(Speaker).filter(
            Speaker.session_id == session_id,
            Speaker.speaker_id == merge_request.source_speaker_id
        ).first()
        
        if source_speaker:
            db.delete(source_speaker)
        
        db.commit()
        
        return {"message": "Speakers merged successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to merge speakers: {str(e)}")

@app.get("/sessions/{session_id}/segments")
async def get_session_segments(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Get all segments for a session with speaker information"""
    try:
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        
        segment_list = []
        for segment in segments:
            segment_list.append({
                'id': segment.id,
                'start': segment.start_time / 1000.0,
                'end': segment.end_time / 1000.0,
                'speaker_id': segment.speaker_id,
                'text': segment.text,
                'confidence': segment.confidence / 100.0
            })
        
        return segment_list
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get segments: {str(e)}")

@app.get("/sessions/{session_id}/export/json")
async def export_session_json(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Export session as JSON with speaker information"""
    try:
        # Get session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get segments
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        
        # Get speakers
        speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
        
        # Get AI-generated content
        summary = db.query(Summary).filter(Summary.session_id == session_id).first()
        action_items = db.query(ActionItem).filter(ActionItem.session_id == session_id).all()
        follow_ups = db.query(FollowUp).filter(FollowUp.session_id == session_id).all()
        risks = db.query(Risk).filter(Risk.session_id == session_id).all()
        
        # Generate export data
        export_data = export_service.export_json(
            session, speakers, segments, summary, action_items, follow_ups, risks
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export session: {str(e)}")

@app.get("/sessions/{session_id}/export/md")
async def export_session_markdown(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Export session as Markdown"""
    try:
        # Get session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get all related data
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
        summary = db.query(Summary).filter(Summary.session_id == session_id).first()
        action_items = db.query(ActionItem).filter(ActionItem.session_id == session_id).all()
        follow_ups = db.query(FollowUp).filter(FollowUp.session_id == session_id).all()
        risks = db.query(Risk).filter(Risk.session_id == session_id).all()
        
        # Generate markdown content
        md_content = export_service.export_markdown(
            session, speakers, segments, summary, action_items, follow_ups, risks
        )
        
        return {"content": md_content, "filename": f"{session.title.replace(' ', '_')}.md"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export markdown: {str(e)}")

@app.get("/sessions/{session_id}/export/txt")
async def export_session_txt(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Export session as plain text"""
    try:
        # Get session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get all related data
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
        summary = db.query(Summary).filter(Summary.session_id == session_id).first()
        action_items = db.query(ActionItem).filter(ActionItem.session_id == session_id).all()
        follow_ups = db.query(FollowUp).filter(FollowUp.session_id == session_id).all()
        risks = db.query(Risk).filter(Risk.session_id == session_id).all()
        
        # Generate text content
        txt_content = export_service.export_txt(
            session, speakers, segments, summary, action_items, follow_ups, risks
        )
        
        return {"content": txt_content, "filename": f"{session.title.replace(' ', '_')}.txt"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export text: {str(e)}")

@app.get("/sessions/{session_id}/export/srt")
async def export_session_srt(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Export session as SRT subtitles"""
    try:
        # Get session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get segments and speakers
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
        
        # Generate SRT content (export service handles empty segments)
        srt_content = export_service.export_srt(segments, speakers)
        
        return {"content": srt_content, "filename": f"{session.title.replace(' ', '_')}.srt"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export SRT: {str(e)}")

@app.get("/sessions/{session_id}/export/vtt")
async def export_session_vtt(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Export session as WebVTT subtitles"""
    try:
        # Get session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get segments and speakers
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
        
        # Generate VTT content (export service handles empty segments)
        vtt_content = export_service.export_vtt(segments, speakers)
        
        return {"content": vtt_content, "filename": f"{session.title.replace(' ', '_')}.vtt"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export VTT: {str(e)}")

@app.get("/sessions/{session_id}/export/csv")
async def export_session_csv(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Export action items as CSV"""
    try:
        # Get session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get action items
        action_items = db.query(ActionItem).filter(ActionItem.session_id == session_id).all()
        
        # Generate CSV content (export service handles empty action items)
        csv_content = export_service.export_csv_action_items(action_items)
        
        return {"content": csv_content, "filename": f"{session.title.replace(' ', '_')}_action_items.csv"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")

# Settings endpoints
@app.get("/settings")
async def get_settings(_: str = Depends(verify_passcode)):
    """Get application settings"""
    return {
        "autoDelete": True,
        "retentionDays": 180,
        "ollamaUrl": "http://localhost:11435",
        "modelName": "llama3.2:3b",
        "transcriptionModel": "whisper-1",
        "diarizationEnabled": True,
        "aiProcessingEnabled": True
    }

@app.put("/settings")
async def update_settings(
    settings: dict,
    _: str = Depends(verify_passcode)
):
    """Update application settings"""
    # In a real implementation, you'd save these to a database or config file
    return {"message": "Settings updated successfully", "settings": settings}

# Upload recording endpoint
@app.post("/sessions/upload")
async def upload_recording(
    file: UploadFile = File(...),
    title: str = Form(...),
    speakers: str = Form(""),
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Upload a recording file"""
    try:
        # Create new session
        session = Session(
            title=title,
            device_info="Uploaded file",
            duration=0  # Will be updated after processing
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # In a real implementation, you'd process the uploaded file
        # For now, just return the session info
        return {
            "message": "Recording uploaded successfully",
            "session_id": session.id,
            "filename": file.filename,
            "size": file.size if hasattr(file, 'size') else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload recording: {str(e)}")

@app.post("/sessions/{session_id}/ai/queue")
async def queue_session_ai_processing(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Queue session for background AI processing"""
    try:
        # Verify session exists
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if already processing
        status = background_processor.get_processing_status(session_id)
        if status["status"] in ["queued", "processing"]:
            return {
                "message": "Session is already queued for processing",
                "status": status["status"]
            }
        
        # Queue for processing
        await background_processor.queue_session_processing(session_id)
        
        return {
            "message": "Session queued for AI processing",
            "status": "queued"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue session: {str(e)}")

@app.get("/sessions/{session_id}/ai/status")
async def get_ai_processing_status(
    session_id: int,
    _: str = Depends(verify_passcode)
):
    """Get AI processing status for a session"""
    try:
        status = background_processor.get_processing_status(session_id)
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get processing status: {str(e)}")

@app.post("/sessions/{session_id}/ai/process")
async def process_session_ai(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Process session with AI to generate summaries, action items, and follow-ups"""
    try:
        # Verify session exists
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get all segments for this session
        segments = db.query(Segment).filter(Segment.session_id == session_id).all()
        if not segments:
            raise HTTPException(status_code=400, detail="No segments found for this session")
        
        # Get speakers for this session
        speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
        speaker_list = [
            {
                "speaker_id": speaker.speaker_id,
                "display_name": speaker.display_name,
                "color": speaker.color
            }
            for speaker in speakers
        ]
        
        # Combine all segment text into transcript
        transcript_text = " ".join([segment.text for segment in segments])
        
        # Process with AI
        ai_result = await ai_service.process_session(
            session_id=session_id,
            transcript_text=transcript_text,
            speakers=speaker_list,
            session_title=session.title
        )
        
        if "error" in ai_result:
            raise HTTPException(status_code=500, detail=ai_result["error"])
        
        # Save summary
        if "summary" in ai_result and "error" not in ai_result["summary"]:
            summary_data = ai_result["summary"]
            summary = Summary(
                session_id=session_id,
                tldr=summary_data.get("tldr"),
                key_topics=json.dumps(summary_data.get("key_topics", [])),
                meeting_type=summary_data.get("meeting_type")
            )
            db.add(summary)
        
        # Save action items
        for item_data in ai_result.get("action_items", []):
            action_item = ActionItem(
                session_id=session_id,
                task=item_data.get("task", ""),
                owner=item_data.get("owner", "TBD"),
                due_date=item_data.get("due_date", "TBD"),
                priority=item_data.get("priority", "medium"),
                context=item_data.get("context", "")
            )
            db.add(action_item)
        
        # Save follow-ups
        for followup_data in ai_result.get("follow_ups", []):
            followup = FollowUp(
                session_id=session_id,
                question=followup_data.get("question", ""),
                category=followup_data.get("category"),
                urgency=followup_data.get("urgency"),
                context=followup_data.get("context", "")
            )
            db.add(followup)
        
        # Save risks
        for risk_data in ai_result.get("risks", []):
            risk = Risk(
                session_id=session_id,
                risk_description=risk_data.get("risk", ""),
                impact=risk_data.get("impact"),
                likelihood=risk_data.get("likelihood"),
                mitigation=risk_data.get("mitigation", "")
            )
            db.add(risk)
        
        db.commit()
        
        return {
            "message": "AI processing completed successfully",
            "processed_at": ai_result.get("processed_at"),
            "summary_generated": "summary" in ai_result,
            "action_items_count": len(ai_result.get("action_items", [])),
            "follow_ups_count": len(ai_result.get("follow_ups", [])),
            "risks_count": len(ai_result.get("risks", []))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

@app.get("/sessions/{session_id}/summary", response_model=SummaryResponse)
async def get_session_summary(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Get AI-generated summary for a session"""
    try:
        summary = db.query(Summary).filter(Summary.session_id == session_id).first()
        if not summary:
            raise HTTPException(status_code=404, detail="Summary not found for this session")
        
        # Parse key_topics JSON
        key_topics = []
        if summary.key_topics:
            try:
                key_topics = json.loads(summary.key_topics)
            except json.JSONDecodeError:
                key_topics = []
        
        return SummaryResponse(
            id=summary.id,
            session_id=summary.session_id,
            tldr=summary.tldr,
            key_topics=key_topics,
            meeting_type=summary.meeting_type,
            processed_at=summary.processed_at
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

@app.get("/sessions/{session_id}/action-items", response_model=List[ActionItemResponse])
async def get_session_action_items(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Get action items for a session"""
    try:
        action_items = db.query(ActionItem).filter(ActionItem.session_id == session_id).all()
        return [
            ActionItemResponse(
                id=item.id,
                session_id=item.session_id,
                task=item.task,
                owner=item.owner,
                due_date=item.due_date,
                priority=item.priority,
                context=item.context,
                completed=item.completed,
                created_at=item.created_at
            )
            for item in action_items
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get action items: {str(e)}")

@app.get("/sessions/{session_id}/follow-ups", response_model=List[FollowUpResponse])
async def get_session_follow_ups(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Get follow-up questions for a session"""
    try:
        follow_ups = db.query(FollowUp).filter(FollowUp.session_id == session_id).all()
        return [
            FollowUpResponse(
                id=fu.id,
                session_id=fu.session_id,
                question=fu.question,
                category=fu.category,
                urgency=fu.urgency,
                context=fu.context,
                resolved=fu.resolved,
                created_at=fu.created_at
            )
            for fu in follow_ups
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get follow-ups: {str(e)}")

@app.get("/sessions/{session_id}/risks", response_model=List[RiskResponse])
async def get_session_risks(
    session_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_passcode)
):
    """Get risks for a session"""
    try:
        risks = db.query(Risk).filter(Risk.session_id == session_id).all()
        return [
            RiskResponse(
                id=risk.id,
                session_id=risk.session_id,
                risk_description=risk.risk_description,
                impact=risk.impact,
                likelihood=risk.likelihood,
                mitigation=risk.mitigation,
                status=risk.status,
                created_at=risk.created_at
            )
            for risk in risks
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get risks: {str(e)}")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove broken connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # Echo back for now - can be extended for real-time features
            await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

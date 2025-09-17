import asyncio
import logging
from typing import Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from ai_service import ai_service
from models import SessionLocal, Session as SessionModel, Segment, Speaker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackgroundProcessor:
    def __init__(self):
        self.processing_queue = asyncio.Queue()
        self.processing_status = {}  # session_id -> status
        self.is_running = False
    
    async def start(self):
        """Start the background processor"""
        if self.is_running:
            return
        
        self.is_running = True
        logger.info("Background processor started")
        
        # Start the worker task
        asyncio.create_task(self._worker())
    
    async def stop(self):
        """Stop the background processor"""
        self.is_running = False
        logger.info("Background processor stopped")
    
    async def queue_session_processing(self, session_id: int):
        """Queue a session for AI processing"""
        if session_id in self.processing_status:
            logger.warning(f"Session {session_id} is already being processed")
            return
        
        self.processing_status[session_id] = {
            "status": "queued",
            "started_at": None,
            "completed_at": None,
            "error": None
        }
        
        await self.processing_queue.put(session_id)
        logger.info(f"Queued session {session_id} for processing")
    
    def get_processing_status(self, session_id: int) -> Dict[str, Any]:
        """Get the processing status for a session"""
        return self.processing_status.get(session_id, {
            "status": "not_found",
            "started_at": None,
            "completed_at": None,
            "error": None
        })
    
    async def _worker(self):
        """Background worker that processes sessions"""
        while self.is_running:
            try:
                # Wait for a session to process
                session_id = await asyncio.wait_for(self.processing_queue.get(), timeout=1.0)
                
                # Update status to processing
                self.processing_status[session_id] = {
                    "status": "processing",
                    "started_at": datetime.utcnow(),
                    "completed_at": None,
                    "error": None
                }
                
                logger.info(f"Starting AI processing for session {session_id}")
                
                try:
                    # Process the session
                    await self._process_session(session_id)
                    
                    # Mark as completed
                    self.processing_status[session_id] = {
                        "status": "completed",
                        "started_at": self.processing_status[session_id]["started_at"],
                        "completed_at": datetime.utcnow(),
                        "error": None
                    }
                    
                    logger.info(f"Completed AI processing for session {session_id}")
                    
                except Exception as e:
                    # Mark as failed
                    self.processing_status[session_id] = {
                        "status": "failed",
                        "started_at": self.processing_status[session_id]["started_at"],
                        "completed_at": datetime.utcnow(),
                        "error": str(e)
                    }
                    
                    logger.error(f"Failed to process session {session_id}: {e}")
                
                # Mark task as done
                self.processing_queue.task_done()
                
            except asyncio.TimeoutError:
                # No tasks in queue, continue
                continue
            except Exception as e:
                logger.error(f"Error in background worker: {e}")
                await asyncio.sleep(1)  # Wait before retrying
    
    async def _process_session(self, session_id: int):
        """Process a single session with AI"""
        db = SessionLocal()
        try:
            # Get session
            session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Get segments
            segments = db.query(Segment).filter(Segment.session_id == session_id).all()
            if not segments:
                raise ValueError(f"No segments found for session {session_id}")
            
            # Get speakers
            speakers = db.query(Speaker).filter(Speaker.session_id == session_id).all()
            speaker_list = [
                {
                    "speaker_id": speaker.speaker_id,
                    "display_name": speaker.display_name,
                    "color": speaker.color
                }
                for speaker in speakers
            ]
            
            # Combine transcript text
            transcript_text = " ".join([segment.text for segment in segments])
            
            # Process with AI
            ai_result = await ai_service.process_session(
                session_id=session_id,
                transcript_text=transcript_text,
                speakers=speaker_list,
                session_title=session.title
            )
            
            if "error" in ai_result:
                raise ValueError(f"AI processing failed: {ai_result['error']}")
            
            # Save results to database (this would be handled by the main API endpoint)
            # For now, we'll just log the results
            logger.info(f"AI processing completed for session {session_id}: {ai_result}")
            
        finally:
            db.close()

# Global background processor instance
background_processor = BackgroundProcessor()

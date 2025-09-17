import os
import tempfile
import logging
from typing import Optional
from faster_whisper import WhisperModel
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.compute_type = "float16" if self.device == "cuda" else "int8"
        logger.info(f"Initializing transcription service with device: {self.device}")
        
    def load_model(self, model_size: str = "base"):
        """Load the Whisper model"""
        try:
            logger.info(f"Loading Whisper model: {model_size}")
            self.model = WhisperModel(
                model_size, 
                device=self.device, 
                compute_type=self.compute_type
            )
            logger.info("Whisper model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            return False
    
    def transcribe_audio(self, audio_data: bytes, language: Optional[str] = None) -> dict:
        """Transcribe audio data and return transcription result"""
        if not self.model:
            if not self.load_model():
                return {"error": "Failed to load transcription model"}
        
        try:
            # Save audio data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Transcribe the audio
                segments, info = self.model.transcribe(
                    temp_file_path,
                    language=language,
                    beam_size=5,
                    best_of=5,
                    temperature=0.0,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=500)
                )
                
                # Combine all segments into a single transcript
                transcript_text = ""
                segments_list = []
                
                for segment in segments:
                    transcript_text += segment.text + " "
                    segments_list.append({
                        "start": segment.start,
                        "end": segment.end,
                        "text": segment.text.strip(),
                        "confidence": getattr(segment, 'avg_logprob', 0.0)
                    })
                
                # Clean up temporary file
                os.unlink(temp_file_path)
                
                return {
                    "transcript": transcript_text.strip(),
                    "segments": segments_list,
                    "language": info.language,
                    "language_probability": info.language_probability,
                    "duration": info.duration
                }
                
            except Exception as e:
                # Clean up temporary file on error
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                raise e
                
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return {"error": f"Transcription failed: {str(e)}"}

# Global transcription service instance
transcription_service = TranscriptionService()

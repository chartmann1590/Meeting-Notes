import os
import tempfile
import logging
import numpy as np
from typing import List, Dict, Optional, Tuple
import torch
from sklearn.cluster import AgglomerativeClustering
from sklearn.preprocessing import StandardScaler
import librosa

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SpeakerDiarizationService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing diarization service with device: {self.device}")
        
    def load_pipeline(self):
        """Load the diarization pipeline (simplified version)"""
        try:
            logger.info("Using basic VAD + clustering approach")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize diarization: {e}")
            return False
    
    def extract_audio_features(self, audio_path: str, sample_rate: int = 16000) -> Tuple[np.ndarray, List[Dict]]:
        """Extract MFCC features and voice activity segments from audio"""
        try:
            # Load audio
            audio, sr = librosa.load(audio_path, sr=sample_rate)
            
            # Voice Activity Detection using librosa
            # Use spectral centroid and zero crossing rate for VAD
            spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
            zcr = librosa.feature.zero_crossing_rate(audio)[0]
            
            # Simple VAD: combine spectral centroid and ZCR
            vad_threshold = np.mean(spectral_centroids) * 0.3
            voice_activity = (spectral_centroids > vad_threshold) & (zcr < np.mean(zcr) * 1.5)
            
            # Create voice activity segments
            segments = []
            in_speech = False
            start_time = 0
            
            frame_duration = len(audio) / len(voice_activity)
            
            for i, is_voice in enumerate(voice_activity):
                current_time = i * frame_duration
                
                if is_voice and not in_speech:
                    start_time = current_time
                    in_speech = True
                elif not is_voice and in_speech:
                    if current_time - start_time > 0.5:  # Minimum segment duration
                        segments.append({"start": start_time, "end": current_time})
                    in_speech = False
            
            # Handle case where audio ends during speech
            if in_speech and len(audio) / sr - start_time > 0.5:
                segments.append({"start": start_time, "end": len(audio) / sr})
            
            # Extract MFCC features for each segment
            features = []
            for segment in segments:
                start_sample = int(segment["start"] * sr)
                end_sample = int(segment["end"] * sr)
                segment_audio = audio[start_sample:end_sample]
                
                if len(segment_audio) > 0:
                    mfcc = librosa.feature.mfcc(y=segment_audio, sr=sr, n_mfcc=13)
                    # Take mean across time dimension
                    features.append(np.mean(mfcc, axis=1))
            
            if len(features) == 0:
                return np.array([]), segments
                
            return np.array(features), segments
            
        except Exception as e:
            logger.error(f"Error extracting audio features: {e}")
            return np.array([]), []
    
    def cluster_speakers(self, features: np.ndarray, segments: List[Dict], 
                        min_speakers: int = 1, max_speakers: int = 10) -> List[Dict]:
        """Cluster audio segments into speakers using hierarchical clustering"""
        if len(features) == 0 or len(segments) == 0:
            return []
        
        try:
            # Normalize features
            scaler = StandardScaler()
            features_normalized = scaler.fit_transform(features)
            
            # Determine optimal number of speakers
            n_speakers = min(max_speakers, max(min_speakers, len(features) // 3))
            
            # Perform clustering
            clustering = AgglomerativeClustering(
                n_clusters=n_speakers,
                linkage='ward'
            )
            speaker_labels = clustering.fit_predict(features_normalized)
            
            # Create speaker segments
            speaker_segments = []
            for i, (segment, label) in enumerate(zip(segments, speaker_labels)):
                speaker_segments.append({
                    'start': segment["start"],
                    'end': segment["end"],
                    'speaker_id': f"speaker_{label}",
                    'confidence': 0.8  # Default confidence
                })
            
            return speaker_segments
            
        except Exception as e:
            logger.error(f"Error clustering speakers: {e}")
            return []
    
    def diarize_audio(self, audio_path: str, min_speakers: int = 1, max_speakers: int = 10) -> Dict:
        """Perform speaker diarization on audio file"""
        try:
            # Use basic VAD + clustering approach
            features, segments = self.extract_audio_features(audio_path)
            speaker_segments = self.cluster_speakers(features, segments, min_speakers, max_speakers)
            
            return {
                'speaker_segments': speaker_segments,
                'method': 'basic_vad_clustering',
                'num_speakers': len(set(seg['speaker_id'] for seg in speaker_segments))
            }
            
        except Exception as e:
            logger.error(f"Diarization error: {e}")
            return {
                'speaker_segments': [],
                'method': 'error',
                'num_speakers': 0,
                'error': str(e)
            }
    
    def merge_speaker_segments(self, segments: List[Dict], merge_threshold: float = 0.5) -> List[Dict]:
        """Merge consecutive segments from the same speaker if they're close enough"""
        if not segments:
            return segments
        
        merged = []
        current_segment = segments[0].copy()
        
        for next_segment in segments[1:]:
            # If same speaker and gap is small, merge
            if (current_segment['speaker_id'] == next_segment['speaker_id'] and 
                next_segment['start'] - current_segment['end'] <= merge_threshold):
                current_segment['end'] = next_segment['end']
            else:
                merged.append(current_segment)
                current_segment = next_segment.copy()
        
        merged.append(current_segment)
        return merged

# Global diarization service instance
diarization_service = SpeakerDiarizationService()

from datetime import datetime
from typing import Dict, List, Any
import json
import csv
import io
from models import Session, Speaker, Segment, Summary, ActionItem, FollowUp, Risk

class ExportService:
    """Service for generating various export formats from session data"""
    
    def __init__(self):
        pass
    
    def export_markdown(self, session: Session, speakers: List[Speaker], segments: List[Segment], 
                       summary: Summary = None, action_items: List[ActionItem] = None, 
                       follow_ups: List[FollowUp] = None, risks: List[Risk] = None) -> str:
        """Generate Markdown export for a session"""
        
        # Header
        md_content = f"# {session.title}\n\n"
        md_content += f"**Date:** {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
        md_content += f"**Duration:** {self._format_duration(session.duration)}\n"
        if session.device_info:
            md_content += f"**Device:** {session.device_info}\n"
        md_content += "\n---\n\n"
        
        # Summary section
        if summary:
            md_content += "## Summary\n\n"
            if summary.tldr:
                md_content += f"**TL;DR:** {summary.tldr}\n\n"
            
            if summary.key_topics:
                try:
                    key_topics = json.loads(summary.key_topics)
                    if key_topics:
                        md_content += "**Key Topics:**\n"
                        for topic in key_topics:
                            md_content += f"- {topic}\n"
                        md_content += "\n"
                except json.JSONDecodeError:
                    pass
            
            if summary.meeting_type:
                md_content += f"**Meeting Type:** {summary.meeting_type}\n\n"
        
        # Action Items section
        if action_items:
            md_content += "## Action Items\n\n"
            for item in action_items:
                status = "✅" if item.completed else "⏳"
                priority_icon = self._get_priority_icon(item.priority)
                md_content += f"{status} **{item.task}**\n"
                md_content += f"   - **Owner:** {item.owner}\n"
                if item.due_date and item.due_date != "TBD":
                    md_content += f"   - **Due:** {item.due_date}\n"
                if item.priority:
                    md_content += f"   - **Priority:** {priority_icon} {item.priority.title()}\n"
                if item.context:
                    md_content += f"   - **Context:** {item.context}\n"
                md_content += "\n"
        
        # Follow-ups section
        if follow_ups:
            md_content += "## Follow-up Questions\n\n"
            for fu in follow_ups:
                urgency_icon = self._get_urgency_icon(fu.urgency)
                md_content += f"**Q:** {fu.question}\n"
                if fu.category:
                    md_content += f"   - **Category:** {fu.category}\n"
                if fu.urgency:
                    md_content += f"   - **Urgency:** {urgency_icon} {fu.urgency.title()}\n"
                if fu.context:
                    md_content += f"   - **Context:** {fu.context}\n"
                md_content += "\n"
        
        # Risks section
        if risks:
            md_content += "## Risks & Concerns\n\n"
            for risk in risks:
                impact_icon = self._get_impact_icon(risk.impact)
                likelihood_icon = self._get_likelihood_icon(risk.likelihood)
                md_content += f"**Risk:** {risk.risk_description}\n"
                if risk.impact:
                    md_content += f"   - **Impact:** {impact_icon} {risk.impact.title()}\n"
                if risk.likelihood:
                    md_content += f"   - **Likelihood:** {likelihood_icon} {risk.likelihood.title()}\n"
                if risk.mitigation:
                    md_content += f"   - **Mitigation:** {risk.mitigation}\n"
                md_content += f"   - **Status:** {risk.status.title()}\n"
                md_content += "\n"
        
        # Transcript section
        md_content += "## Transcript\n\n"
        
        # Group segments by speaker
        speaker_segments = {}
        for segment in segments:
            speaker_id = segment.speaker_id
            if speaker_id not in speaker_segments:
                speaker_segments[speaker_id] = []
            speaker_segments[speaker_id].append(segment)
        
        # Get speaker display names
        speaker_names = {s.speaker_id: s.display_name for s in speakers}
        
        # Sort segments by start time
        for speaker_id in speaker_segments:
            speaker_segments[speaker_id].sort(key=lambda x: x.start_time)
        
        # Generate transcript
        all_segments = []
        for speaker_id, segs in speaker_segments.items():
            all_segments.extend(segs)
        
        all_segments.sort(key=lambda x: x.start_time)
        
        for segment in all_segments:
            speaker_name = speaker_names.get(segment.speaker_id, f"Speaker {segment.speaker_id}")
            timestamp = self._format_timestamp(segment.start_time)
            md_content += f"**[{timestamp}] {speaker_name}:** {segment.text}\n\n"
        
        return md_content
    
    def export_txt(self, session: Session, speakers: List[Speaker], segments: List[Segment], 
                   summary: Summary = None, action_items: List[ActionItem] = None, 
                   follow_ups: List[FollowUp] = None, risks: List[Risk] = None) -> str:
        """Generate plain text export for a session"""
        
        # Header
        txt_content = f"{session.title}\n"
        txt_content += "=" * len(session.title) + "\n\n"
        txt_content += f"Date: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
        txt_content += f"Duration: {self._format_duration(session.duration)}\n"
        if session.device_info:
            txt_content += f"Device: {session.device_info}\n"
        txt_content += "\n" + "-" * 50 + "\n\n"
        
        # Summary section
        if summary:
            txt_content += "SUMMARY\n"
            txt_content += "-" * 7 + "\n\n"
            if summary.tldr:
                txt_content += f"TL;DR: {summary.tldr}\n\n"
            
            if summary.key_topics:
                try:
                    key_topics = json.loads(summary.key_topics)
                    if key_topics:
                        txt_content += "Key Topics:\n"
                        for topic in key_topics:
                            txt_content += f"  - {topic}\n"
                        txt_content += "\n"
                except json.JSONDecodeError:
                    pass
            
            if summary.meeting_type:
                txt_content += f"Meeting Type: {summary.meeting_type}\n\n"
        
        # Action Items section
        if action_items:
            txt_content += "ACTION ITEMS\n"
            txt_content += "-" * 12 + "\n\n"
            for i, item in enumerate(action_items, 1):
                status = "COMPLETED" if item.completed else "PENDING"
                txt_content += f"{i}. {item.task} [{status}]\n"
                txt_content += f"   Owner: {item.owner}\n"
                if item.due_date and item.due_date != "TBD":
                    txt_content += f"   Due: {item.due_date}\n"
                if item.priority:
                    txt_content += f"   Priority: {item.priority.upper()}\n"
                if item.context:
                    txt_content += f"   Context: {item.context}\n"
                txt_content += "\n"
        
        # Follow-ups section
        if follow_ups:
            txt_content += "FOLLOW-UP QUESTIONS\n"
            txt_content += "-" * 19 + "\n\n"
            for i, fu in enumerate(follow_ups, 1):
                txt_content += f"{i}. {fu.question}\n"
                if fu.category:
                    txt_content += f"   Category: {fu.category}\n"
                if fu.urgency:
                    txt_content += f"   Urgency: {fu.urgency.upper()}\n"
                if fu.context:
                    txt_content += f"   Context: {fu.context}\n"
                txt_content += "\n"
        
        # Risks section
        if risks:
            txt_content += "RISKS & CONCERNS\n"
            txt_content += "-" * 16 + "\n\n"
            for i, risk in enumerate(risks, 1):
                txt_content += f"{i}. {risk.risk_description}\n"
                if risk.impact:
                    txt_content += f"   Impact: {risk.impact.upper()}\n"
                if risk.likelihood:
                    txt_content += f"   Likelihood: {risk.likelihood.upper()}\n"
                if risk.mitigation:
                    txt_content += f"   Mitigation: {risk.mitigation}\n"
                txt_content += f"   Status: {risk.status.upper()}\n"
                txt_content += "\n"
        
        # Transcript section
        txt_content += "TRANSCRIPT\n"
        txt_content += "-" * 10 + "\n\n"
        
        # Group segments by speaker
        speaker_segments = {}
        for segment in segments:
            speaker_id = segment.speaker_id
            if speaker_id not in speaker_segments:
                speaker_segments[speaker_id] = []
            speaker_segments[speaker_id].append(segment)
        
        # Get speaker display names
        speaker_names = {s.speaker_id: s.display_name for s in speakers}
        
        # Sort segments by start time
        for speaker_id in speaker_segments:
            speaker_segments[speaker_id].sort(key=lambda x: x.start_time)
        
        # Generate transcript
        all_segments = []
        for speaker_id, segs in speaker_segments.items():
            all_segments.extend(segs)
        
        all_segments.sort(key=lambda x: x.start_time)
        
        for segment in all_segments:
            speaker_name = speaker_names.get(segment.speaker_id, f"Speaker {segment.speaker_id}")
            timestamp = self._format_timestamp(segment.start_time)
            txt_content += f"[{timestamp}] {speaker_name}: {segment.text}\n\n"
        
        return txt_content
    
    def export_json(self, session: Session, speakers: List[Speaker], segments: List[Segment], 
                    summary: Summary = None, action_items: List[ActionItem] = None, 
                    follow_ups: List[FollowUp] = None, risks: List[Risk] = None) -> Dict[str, Any]:
        """Generate structured JSON export for a session"""
        
        # Parse key topics if available
        key_topics = []
        if summary and summary.key_topics:
            try:
                key_topics = json.loads(summary.key_topics)
            except json.JSONDecodeError:
                key_topics = []
        
        return {
            "session": {
                "id": session.id,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "duration": session.duration,
                "device_info": session.device_info,
                "retention_enabled": session.retention_enabled
            },
            "speakers": [
                {
                    "speaker_id": speaker.speaker_id,
                    "display_name": speaker.display_name,
                    "color": speaker.color,
                    "notes": speaker.notes
                }
                for speaker in speakers
            ],
            "segments": [
                {
                    "id": segment.id,
                    "start": segment.start_time / 1000.0,  # Convert to seconds
                    "end": segment.end_time / 1000.0,
                    "speaker_id": segment.speaker_id,
                    "text": segment.text,
                    "confidence": segment.confidence / 100.0
                }
                for segment in segments
            ],
            "summary": {
                "tldr": summary.tldr if summary else None,
                "key_topics": key_topics,
                "meeting_type": summary.meeting_type if summary else None,
                "processed_at": summary.processed_at.isoformat() if summary and summary.processed_at else None
            } if summary else None,
            "action_items": [
                {
                    "id": item.id,
                    "task": item.task,
                    "owner": item.owner,
                    "due_date": item.due_date,
                    "priority": item.priority,
                    "context": item.context,
                    "completed": item.completed,
                    "created_at": item.created_at.isoformat()
                }
                for item in (action_items or [])
            ],
            "follow_ups": [
                {
                    "id": fu.id,
                    "question": fu.question,
                    "category": fu.category,
                    "urgency": fu.urgency,
                    "context": fu.context,
                    "resolved": fu.resolved,
                    "created_at": fu.created_at.isoformat()
                }
                for fu in (follow_ups or [])
            ],
            "risks": [
                {
                    "id": risk.id,
                    "risk_description": risk.risk_description,
                    "impact": risk.impact,
                    "likelihood": risk.likelihood,
                    "mitigation": risk.mitigation,
                    "status": risk.status,
                    "created_at": risk.created_at.isoformat()
                }
                for risk in (risks or [])
            ],
            "metadata": {
                "exported_at": datetime.utcnow().isoformat(),
                "total_segments": len(segments),
                "total_speakers": len(speakers),
                "version": "1.0.0"
            }
        }
    
    def export_srt(self, segments: List[Segment], speakers: List[Speaker]) -> str:
        """Generate SRT subtitle format export"""
        
        if not segments:
            return "WEBVTT\n\n1\n00:00:00,000 --> 00:00:01,000\nNo transcript available\n\n"
        
        srt_content = ""
        speaker_names = {s.speaker_id: s.display_name for s in speakers}
        
        # Sort segments by start time
        sorted_segments = sorted(segments, key=lambda x: x.start_time)
        
        for i, segment in enumerate(sorted_segments, 1):
            start_time = self._format_srt_timestamp(segment.start_time)
            end_time = self._format_srt_timestamp(segment.end_time)
            speaker_name = speaker_names.get(segment.speaker_id, f"Speaker {segment.speaker_id}")
            
            srt_content += f"{i}\n"
            srt_content += f"{start_time} --> {end_time}\n"
            srt_content += f"{speaker_name}: {segment.text}\n\n"
        
        return srt_content
    
    def export_vtt(self, segments: List[Segment], speakers: List[Speaker]) -> str:
        """Generate WebVTT subtitle format export"""
        
        vtt_content = "WEBVTT\n\n"
        
        if not segments:
            vtt_content += "00:00:00.000 --> 00:00:01.000\nNo transcript available\n\n"
            return vtt_content
        
        speaker_names = {s.speaker_id: s.display_name for s in speakers}
        
        # Sort segments by start time
        sorted_segments = sorted(segments, key=lambda x: x.start_time)
        
        for segment in sorted_segments:
            start_time = self._format_vtt_timestamp(segment.start_time)
            end_time = self._format_vtt_timestamp(segment.end_time)
            speaker_name = speaker_names.get(segment.speaker_id, f"Speaker {segment.speaker_id}")
            
            vtt_content += f"{start_time} --> {end_time}\n"
            vtt_content += f"{speaker_name}: {segment.text}\n\n"
        
        return vtt_content
    
    def export_csv_action_items(self, action_items: List[ActionItem]) -> str:
        """Generate CSV export for action items"""
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "ID", "Task", "Owner", "Due Date", "Priority", 
            "Context", "Completed", "Created At"
        ])
        
        # Data rows
        if not action_items:
            writer.writerow([
                "", "No action items available", "", "", "", "", "", ""
            ])
        else:
            for item in action_items:
                writer.writerow([
                    item.id,
                    item.task,
                    item.owner,
                    item.due_date or "",
                    item.priority or "",
                    item.context or "",
                    "Yes" if item.completed else "No",
                    item.created_at.strftime('%Y-%m-%d %H:%M:%S')
                ])
        
        return output.getvalue()
    
    def _format_duration(self, seconds: int) -> str:
        """Format duration in seconds to human readable format"""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            minutes = seconds // 60
            remaining_seconds = seconds % 60
            return f"{minutes}m {remaining_seconds}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            remaining_seconds = seconds % 60
            return f"{hours}h {minutes}m {remaining_seconds}s"
    
    def _format_timestamp(self, milliseconds: int) -> str:
        """Format timestamp in milliseconds to MM:SS format"""
        seconds = milliseconds // 1000
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{minutes:02d}:{remaining_seconds:02d}"
    
    def _format_srt_timestamp(self, milliseconds: int) -> str:
        """Format timestamp for SRT format (HH:MM:SS,mmm)"""
        seconds = milliseconds // 1000
        milliseconds_remainder = milliseconds % 1000
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        remaining_seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{remaining_seconds:02d},{milliseconds_remainder:03d}"
    
    def _format_vtt_timestamp(self, milliseconds: int) -> str:
        """Format timestamp for VTT format (HH:MM:SS.mmm)"""
        seconds = milliseconds // 1000
        milliseconds_remainder = milliseconds % 1000
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        remaining_seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{remaining_seconds:02d}.{milliseconds_remainder:03d}"
    
    def _get_priority_icon(self, priority: str) -> str:
        """Get icon for priority level"""
        icons = {
            "high": "🔴",
            "medium": "🟡", 
            "low": "🟢"
        }
        return icons.get(priority, "⚪")
    
    def _get_urgency_icon(self, urgency: str) -> str:
        """Get icon for urgency level"""
        icons = {
            "high": "🚨",
            "medium": "⚠️",
            "low": "ℹ️"
        }
        return icons.get(urgency, "📝")
    
    def _get_impact_icon(self, impact: str) -> str:
        """Get icon for impact level"""
        icons = {
            "high": "💥",
            "medium": "⚡",
            "low": "💡"
        }
        return icons.get(impact, "📌")
    
    def _get_likelihood_icon(self, likelihood: str) -> str:
        """Get icon for likelihood level"""
        icons = {
            "high": "🔴",
            "medium": "🟡",
            "low": "🟢"
        }
        return icons.get(likelihood, "⚪")

import aiohttp
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import re

class AIService:
    def __init__(self, ollama_url: str = "http://ollama:11434"):
        self.ollama_url = ollama_url
        self.model_name = "llama3.2:3b"  # Lightweight model for local use
        
    async def ensure_model_available(self) -> bool:
        """Ensure the required model is available in Ollama"""
        try:
            async with aiohttp.ClientSession() as session:
                # Check if model exists
                async with session.get(f"{self.ollama_url}/api/tags") as response:
                    if response.status == 200:
                        models = await response.json()
                        model_names = [model['name'] for model in models.get('models', [])]
                        if self.model_name in model_names:
                            return True
                
                # Pull model if not available
                print(f"Pulling model {self.model_name}...")
                async with session.post(f"{self.ollama_url}/api/pull", 
                                      json={"name": self.model_name}) as response:
                    if response.status == 200:
                        # Stream the pull progress
                        async for line in response.content:
                            if line:
                                print(line.decode('utf-8').strip())
                        return True
                    else:
                        print(f"Failed to pull model: {response.status}")
                        return False
        except Exception as e:
            print(f"Error ensuring model availability: {e}")
            return False
    
    async def generate_summary(self, transcript_text: str, session_title: str = "") -> Dict[str, Any]:
        """Generate TL;DR summary of the meeting"""
        try:
            # Ensure model is available
            if not await self.ensure_model_available():
                return {"error": "Model not available"}
            
            prompt = f"""You are an AI assistant that creates concise meeting summaries. 

Meeting Title: {session_title}
Transcript: {transcript_text[:4000]}  # Limit to avoid token limits

Please provide a TL;DR summary in the following JSON format:
{{
    "tldr": "A concise 2-3 sentence summary of the main points discussed",
    "key_topics": ["topic1", "topic2", "topic3"],
    "meeting_type": "standup|planning|review|other"
}}

Focus on the most important decisions, outcomes, and key information. Keep it under 200 words."""

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.ollama_url}/api/generate", 
                                      json={
                                          "model": self.model_name,
                                          "prompt": prompt,
                                          "stream": False,
                                          "options": {
                                              "temperature": 0.3,
                                              "top_p": 0.9
                                          }
                                      }) as response:
                    if response.status == 200:
                        result = await response.json()
                        response_text = result.get('response', '')
                        
                        # Try to extract JSON from response
                        try:
                            # Look for JSON in the response
                            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                            if json_match:
                                summary_data = json.loads(json_match.group())
                                return summary_data
                            else:
                                # Fallback: create basic structure
                                return {
                                    "tldr": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                                    "key_topics": [],
                                    "meeting_type": "other"
                                }
                        except json.JSONDecodeError:
                            return {
                                "tldr": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                                "key_topics": [],
                                "meeting_type": "other"
                            }
                    else:
                        return {"error": f"Ollama API error: {response.status}"}
        except Exception as e:
            return {"error": f"Summary generation failed: {str(e)}"}
    
    async def extract_action_items(self, transcript_text: str, speakers: List[Dict]) -> List[Dict[str, Any]]:
        """Extract action items with owners and due dates"""
        try:
            if not await self.ensure_model_available():
                return []
            
            # Create speaker mapping for better context
            speaker_names = [speaker.get('display_name', speaker.get('speaker_id', '')) for speaker in speakers]
            speaker_context = f"Speakers in this meeting: {', '.join(speaker_names)}"
            
            prompt = f"""You are an AI assistant that extracts action items from meeting transcripts.

{speaker_context}

Transcript: {transcript_text[:4000]}

Please extract action items in the following JSON format:
{{
    "action_items": [
        {{
            "task": "Description of the task",
            "owner": "Name of person responsible (from the speakers list or 'TBD')",
            "due_date": "YYYY-MM-DD or 'TBD'",
            "priority": "high|medium|low",
            "context": "Brief context about why this task is needed"
        }}
    ]
}}

Extract only clear, specific action items. If no clear owner is mentioned, use 'TBD'. If no due date is mentioned, use 'TBD'. Focus on concrete, actionable tasks."""

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.ollama_url}/api/generate", 
                                      json={
                                          "model": self.model_name,
                                          "prompt": prompt,
                                          "stream": False,
                                          "options": {
                                              "temperature": 0.2,
                                              "top_p": 0.8
                                          }
                                      }) as response:
                    if response.status == 200:
                        result = await response.json()
                        response_text = result.get('response', '')
                        
                        try:
                            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                            if json_match:
                                action_data = json.loads(json_match.group())
                                return action_data.get('action_items', [])
                            else:
                                return []
                        except json.JSONDecodeError:
                            return []
                    else:
                        return []
        except Exception as e:
            print(f"Action item extraction failed: {str(e)}")
            return []
    
    async def detect_follow_ups(self, transcript_text: str) -> List[Dict[str, Any]]:
        """Detect follow-up questions and potential risks"""
        try:
            if not await self.ensure_model_available():
                return []
            
            prompt = f"""You are an AI assistant that identifies follow-up questions and potential risks from meeting transcripts.

Transcript: {transcript_text[:4000]}

Please identify follow-ups and risks in the following JSON format:
{{
    "follow_ups": [
        {{
            "question": "The follow-up question or concern",
            "category": "technical|process|timeline|resource|other",
            "urgency": "high|medium|low",
            "context": "Why this follow-up is important"
        }}
    ],
    "risks": [
        {{
            "risk": "Description of the potential risk",
            "impact": "high|medium|low",
            "likelihood": "high|medium|low",
            "mitigation": "Suggested mitigation strategy"
        }}
    ]
}}

Focus on unresolved questions, dependencies, and potential issues that need attention."""

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.ollama_url}/api/generate", 
                                      json={
                                          "model": self.model_name,
                                          "prompt": prompt,
                                          "stream": False,
                                          "options": {
                                              "temperature": 0.3,
                                              "top_p": 0.8
                                          }
                                      }) as response:
                    if response.status == 200:
                        result = await response.json()
                        response_text = result.get('response', '')
                        
                        try:
                            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                            if json_match:
                                followup_data = json.loads(json_match.group())
                                return {
                                    'follow_ups': followup_data.get('follow_ups', []),
                                    'risks': followup_data.get('risks', [])
                                }
                            else:
                                return {'follow_ups': [], 'risks': []}
                        except json.JSONDecodeError:
                            return {'follow_ups': [], 'risks': []}
                    else:
                        return {'follow_ups': [], 'risks': []}
        except Exception as e:
            print(f"Follow-up detection failed: {str(e)}")
            return {'follow_ups': [], 'risks': []}
    
    async def process_session(self, session_id: int, transcript_text: str, speakers: List[Dict], session_title: str = "") -> Dict[str, Any]:
        """Process a complete session to generate all AI insights"""
        try:
            print(f"Processing session {session_id} with AI...")
            
            # Run all AI tasks concurrently
            summary_task = self.generate_summary(transcript_text, session_title)
            action_items_task = self.extract_action_items(transcript_text, speakers)
            followups_task = self.detect_follow_ups(transcript_text)
            
            # Wait for all tasks to complete
            summary_result, action_items, followups_result = await asyncio.gather(
                summary_task, action_items_task, followups_task
            )
            
            return {
                "summary": summary_result,
                "action_items": action_items,
                "follow_ups": followups_result.get('follow_ups', []),
                "risks": followups_result.get('risks', []),
                "processed_at": datetime.utcnow().isoformat(),
                "session_id": session_id
            }
        except Exception as e:
            return {"error": f"Session processing failed: {str(e)}"}

# Global instance
ai_service = AIService()

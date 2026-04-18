import json
import groq
from rotator import groq_rotator, execute_with_rotation

class EnergyAnalysisAgent:
    """
    A specialized AI Agent dedicated to analyzing and validating documents for the Energy Sector RAG.
    It provides reasoning, classification, and domain-grounding checks.
    """
    
    def __init__(self):
        self.model = "llama-3.1-8b-instant"
        print("[AGENT] Energy Analysis Agent Initialized.")

    def verify_document_domain(self, text_snippet: str):
        """
        Analyzes a document snippet to determine if it is energy-related.
        Returns a dictionary with validation status and reasoning.
        """
        content = text_snippet[:2000]
        
        prompt = f"""
        You are the 'Gatekeeper Agent' for a specialized Energy Sector RAG platform. 
        Your task is to analyze the provided document content and determine if it belongs to the ENERGY sector.

        ENERGY SECTOR TOPICS INCLUDE:
        - Power generation (Solar, Wind, Nuclear, Hydro, Coal, Gas, etc.)
        - Grid technology and smart meters
        - Energy storage and batteries
        - Electricity markets and energy policy
        - Sustainability and carbon emissions in energy
        - High-voltage engineering

        STRICT REJECTION CRITERIA:
        - Rejection Case A: Personal documents (Resumes, CVs, Bio-data, IDs).
        - Rejection Case B: Financial docs irrelevant to energy markets (Invoices, Receipts for groceries/retail).
        - Rejection Case C: Non-technical literature (Children's stories, general news, sports).

        OUTPUT FORMAT (Strict JSON):
        {{
            "is_energy_related": boolean,
            "category": "Solar/Wind/Grid/General/REJECTED",
            "reasoning": "A one-sentence explanation of why you accepted or rejected this.",
            "confidence": float (0.0 to 1.0)
        }}

        DOCUMENT CONTENT:
        {content}
        """

        def _call_groq(api_key):
            client = groq.Groq(api_key=api_key)
            return client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )

        try:
            response = execute_with_rotation(groq_rotator, _call_groq)
            result = json.loads(response.choices[0].message.content)
            print(f"[AGENT VERDICT] {result['category']} | Valid: {result['is_energy_related']}")
            return result
        except Exception as e:
            print(f"[ERROR] [AGENT ERROR] Failed to analyze domain: {e}")
            return {
                "is_energy_related": True,
                "category": "Unchecked",
                "reasoning": f"AI Agent encountered an error: {str(e)}",
                "confidence": 0.0
            }

    def generate_document_insight(self, text_snippet: str):
        """
        Generates a summary and suggested questions for the document.
        """
        content = text_snippet[:5000]
        
        prompt = f"""
        You are an Energy Data Analyst. Analyze this technical document snippet and provide a summary.
        
        OUTPUT FORMAT (Strict JSON):
        {{
            "summary": "A 3-sentence professional summary focusing on technical highlights.",
            "suggested_questions": [
                "Question 1?",
                "Question 2?",
                "Question 3?"
            ]
        }}
        
        DOCUMENT CONTENT:
        {content}
        """

        def _call_groq(api_key):
            client = groq.Groq(api_key=api_key)
            return client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

        try:
            print(f"[AGENT] Sending request to Groq... (Snippet size: {len(content)} chars)")
            response = execute_with_rotation(groq_rotator, _call_groq)
            print(f"[AGENT] Groq response received successfully.")
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            # CAPTURE EXACT ERROR DATA
            print(f"[ERROR] [AGENT ERROR] Failed to generate insight. Exact Error Type: {type(e).__name__} | Details: {str(e)}")
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                print(f"📦 [AGENT ERROR] Raw API Response: {e.response.text}")
            
            return {
                "summary": "Document successfully indexed and ready for detailed analysis.",
                "suggested_questions": ["What are the key technical specifications?", "Check for sustainability impacts?", "Summary of findings?"]
            }

# Singleton instance for the application
energy_agent = EnergyAnalysisAgent()

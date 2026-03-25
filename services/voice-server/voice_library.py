"""
Voice Library v2.0 — 40+ production voices with industry recommendations.

Each voice includes:
  - Unique ID and human name
  - Gender, age range, accent, tone metadata
  - Model-specific config (pitch, speed, stability, style, warmth)
  - Recommended industries
  - Orpheus TTS speaker mapping
  - Sample prompt for preview
  - Voice cloning support for custom voices
"""

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class VoiceModelConfig:
    """Synthesis parameters for voice reproduction."""
    pitch_shift: float = 0.0       # -12 to +12 semitones
    speed: float = 1.0             # 0.5 to 2.0
    stability: float = 0.5         # 0-1, higher = more consistent
    style: float = 0.4             # 0-1, higher = more expressive
    warmth: float = 0.5            # 0-1, 0 = neutral, 1 = warm
    breathiness: float = 0.2       # 0-1, subtle breathing for realism
    emotion_intensity: float = 0.5 # 0-1, how strongly emotions are expressed


@dataclass
class Voice:
    """Voice definition with full metadata."""
    id: str
    name: str
    gender: str          # "female", "male", "neutral"
    age_range: str       # "young", "middle-aged", "senior"
    accent: str          # "American", "British", "Australian", "Spanish", "French"
    tone: str            # "warm", "professional", "casual", "energetic", etc.
    description: str
    sample_prompt: str
    model_config: VoiceModelConfig
    # Orpheus TTS speaker tag
    orpheus_speaker: str = "tara"
    # Recommended industries for this voice
    recommended_industries: List[str] = field(default_factory=lambda: ["default"])
    # Whether this is a cloned voice
    is_cloned: bool = False
    # Path to reference audio (for cloned voices)
    reference_audio_path: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "gender": self.gender,
            "age_range": self.age_range,
            "accent": self.accent,
            "tone": self.tone,
            "description": self.description,
            "sample_prompt": self.sample_prompt,
            "is_cloned": self.is_cloned,
            "recommended_industries": self.recommended_industries,
            "orpheus_speaker": self.orpheus_speaker,
            "model_config": {
                "pitch_shift": self.model_config.pitch_shift,
                "speed": self.model_config.speed,
                "stability": self.model_config.stability,
                "style": self.model_config.style,
                "warmth": self.model_config.warmth,
                "breathiness": self.model_config.breathiness,
                "emotion_intensity": self.model_config.emotion_intensity,
            },
        }


# ===========================================================================
# Voice Library — 40+ voices organized by persona
# ===========================================================================

VOICE_LIBRARY: List[Voice] = [

    # -----------------------------------------------------------------------
    # AMERICAN FEMALE VOICES
    # -----------------------------------------------------------------------

    Voice(
        id="us-female-warm-receptionist",
        name="Sarah",
        gender="female", age_range="young", accent="American", tone="warm",
        description="Warm, welcoming receptionist. Natural warmth that makes callers feel at home instantly.",
        sample_prompt="Hi there! Welcome to our office. How can I help you today?",
        orpheus_speaker="tara",
        recommended_industries=["hvac", "dental", "salon", "restaurant", "default"],
        model_config=VoiceModelConfig(
            pitch_shift=1.5, speed=0.95, stability=0.45, style=0.5,
            warmth=0.85, breathiness=0.25, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="us-female-professional",
        name="Jennifer",
        gender="female", age_range="middle-aged", accent="American", tone="professional",
        description="Polished and articulate. Commands respect while remaining approachable.",
        sample_prompt="Thank you for contacting our office. I'll be happy to assist you with your inquiry.",
        orpheus_speaker="leah",
        recommended_industries=["legal", "medical", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=0.5, speed=1.0, stability=0.65, style=0.3,
            warmth=0.4, breathiness=0.15, emotion_intensity=0.4,
        ),
    ),
    Voice(
        id="us-female-casual",
        name="Emma",
        gender="female", age_range="young", accent="American", tone="casual",
        description="Casual and friendly. Like talking to a friend who happens to work there.",
        sample_prompt="Hey! What's going on? I'm here to help you out with anything you need.",
        orpheus_speaker="jess",
        recommended_industries=["salon", "automotive", "restaurant"],
        model_config=VoiceModelConfig(
            pitch_shift=1.2, speed=1.05, stability=0.4, style=0.6,
            warmth=0.7, breathiness=0.3, emotion_intensity=0.65,
        ),
    ),
    Voice(
        id="us-female-energetic",
        name="Madison",
        gender="female", age_range="young", accent="American", tone="energetic",
        description="High-energy and enthusiastic. Perfect for promotions and exciting announcements.",
        sample_prompt="Oh wow, you're going to love what we have! Let me tell you all about it!",
        orpheus_speaker="leo",
        recommended_industries=["real_estate", "salon"],
        model_config=VoiceModelConfig(
            pitch_shift=2.0, speed=1.12, stability=0.35, style=0.75,
            warmth=0.6, breathiness=0.2, emotion_intensity=0.8,
        ),
    ),
    Voice(
        id="us-female-calm",
        name="Rachel",
        gender="female", age_range="middle-aged", accent="American", tone="calm",
        description="Calm and reassuring. A soothing presence for sensitive situations.",
        sample_prompt="It's completely normal to feel this way. Let's talk through this together.",
        orpheus_speaker="mia",
        recommended_industries=["medical", "dental", "legal"],
        model_config=VoiceModelConfig(
            pitch_shift=0.2, speed=0.88, stability=0.7, style=0.25,
            warmth=0.8, breathiness=0.3, emotion_intensity=0.45,
        ),
    ),
    Voice(
        id="us-female-authoritative",
        name="Victoria",
        gender="female", age_range="middle-aged", accent="American", tone="authoritative",
        description="Authoritative and direct. Inspires confidence and action.",
        sample_prompt="I need to inform you of important changes. Please listen carefully.",
        orpheus_speaker="leah",
        recommended_industries=["legal", "medical"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.0, speed=1.0, stability=0.65, style=0.35,
            warmth=0.3, breathiness=0.1, emotion_intensity=0.5,
        ),
    ),
    Voice(
        id="us-female-friendly",
        name="Holly",
        gender="female", age_range="young", accent="American", tone="friendly",
        description="Friendly and personable. Builds instant rapport with callers.",
        sample_prompt="It's so nice to connect with you! I'm really excited to help you find what you need.",
        orpheus_speaker="tara",
        recommended_industries=["salon", "restaurant", "default"],
        model_config=VoiceModelConfig(
            pitch_shift=1.5, speed=1.0, stability=0.5, style=0.55,
            warmth=0.8, breathiness=0.25, emotion_intensity=0.65,
        ),
    ),
    Voice(
        id="us-female-empathetic",
        name="Sophie",
        gender="female", age_range="middle-aged", accent="American", tone="empathetic",
        description="Deeply empathetic. Perfect for when callers are stressed or upset.",
        sample_prompt="I understand how important this is to you, and I'm here every step of the way.",
        orpheus_speaker="mia",
        recommended_industries=["medical", "hvac", "plumbing"],
        model_config=VoiceModelConfig(
            pitch_shift=0.5, speed=0.9, stability=0.6, style=0.45,
            warmth=0.9, breathiness=0.3, emotion_intensity=0.7,
        ),
    ),

    # -----------------------------------------------------------------------
    # AMERICAN MALE VOICES
    # -----------------------------------------------------------------------

    Voice(
        id="us-male-confident",
        name="Adam",
        gender="male", age_range="middle-aged", accent="American", tone="confident",
        description="Confident and commanding. Conveys expertise and trustworthiness.",
        sample_prompt="I'm confident we can solve this for you. Here's exactly what we'll do.",
        orpheus_speaker="dan",
        recommended_industries=["roofing", "automotive", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.0, speed=1.0, stability=0.65, style=0.4,
            warmth=0.5, breathiness=0.15, emotion_intensity=0.55,
        ),
    ),
    Voice(
        id="us-male-casual",
        name="Sam",
        gender="male", age_range="young", accent="American", tone="casual",
        description="Laid-back and approachable. Puts callers at ease immediately.",
        sample_prompt="Hey, what's going on? I'm here to help you out with whatever you need.",
        orpheus_speaker="leo",
        recommended_industries=["automotive", "plumbing", "hvac"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.5, speed=1.05, stability=0.4, style=0.6,
            warmth=0.65, breathiness=0.2, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="us-male-professional",
        name="James",
        gender="male", age_range="middle-aged", accent="American", tone="professional",
        description="Polished professional. Perfect for business-to-business and corporate.",
        sample_prompt="Thank you for your business. We appreciate the opportunity to serve you.",
        orpheus_speaker="dan",
        recommended_industries=["legal", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.5, speed=0.95, stability=0.65, style=0.3,
            warmth=0.45, breathiness=0.1, emotion_intensity=0.4,
        ),
    ),
    Voice(
        id="us-male-warm",
        name="Michael",
        gender="male", age_range="middle-aged", accent="American", tone="warm",
        description="Warm and personable. Makes every caller feel like the most important person.",
        sample_prompt="I really appreciate you calling. How can I make your day better?",
        orpheus_speaker="zac",
        recommended_industries=["hvac", "dental", "default"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.8, speed=0.95, stability=0.5, style=0.5,
            warmth=0.85, breathiness=0.2, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="us-male-energetic",
        name="Nathan",
        gender="male", age_range="young", accent="American", tone="energetic",
        description="High-energy and passionate. Gets callers excited about services.",
        sample_prompt="This is incredible! You're going to be blown away by what we've got!",
        orpheus_speaker="leo",
        recommended_industries=["automotive", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.2, speed=1.12, stability=0.35, style=0.7,
            warmth=0.6, breathiness=0.15, emotion_intensity=0.8,
        ),
    ),
    Voice(
        id="us-male-calm",
        name="Daniel",
        gender="male", age_range="middle-aged", accent="American", tone="calm",
        description="Steady and reassuring. A calming presence during stressful calls.",
        sample_prompt="Let's take this one step at a time. I'm right here with you.",
        orpheus_speaker="zac",
        recommended_industries=["medical", "dental", "plumbing"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.0, speed=0.88, stability=0.7, style=0.25,
            warmth=0.75, breathiness=0.25, emotion_intensity=0.45,
        ),
    ),
    Voice(
        id="us-male-deep",
        name="Marcus",
        gender="male", age_range="middle-aged", accent="American", tone="deep",
        description="Deep, authoritative voice. Commands attention and respect.",
        sample_prompt="This requires your immediate attention. Let me walk you through it.",
        orpheus_speaker="dan",
        recommended_industries=["roofing", "legal"],
        model_config=VoiceModelConfig(
            pitch_shift=-4.0, speed=0.95, stability=0.65, style=0.3,
            warmth=0.35, breathiness=0.1, emotion_intensity=0.5,
        ),
    ),
    Voice(
        id="us-male-friendly",
        name="Chris",
        gender="male", age_range="young", accent="American", tone="friendly",
        description="Approachable and relatable. Like talking to a helpful neighbor.",
        sample_prompt="Hey! I'm really glad you called. I think you're going to like what I have to share.",
        orpheus_speaker="leo",
        recommended_industries=["hvac", "plumbing", "default"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.5, speed=1.0, stability=0.5, style=0.55,
            warmth=0.75, breathiness=0.2, emotion_intensity=0.6,
        ),
    ),

    # -----------------------------------------------------------------------
    # BRITISH VOICES
    # -----------------------------------------------------------------------

    Voice(
        id="uk-female-professional",
        name="Charlotte",
        gender="female", age_range="middle-aged", accent="British", tone="professional",
        description="Refined British professional. Conveys quality and sophistication.",
        sample_prompt="Good afternoon. I'm delighted to be of service. How may I assist you?",
        orpheus_speaker="leah",
        recommended_industries=["legal", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=0.5, speed=0.95, stability=0.65, style=0.35,
            warmth=0.45, breathiness=0.15, emotion_intensity=0.4,
        ),
    ),
    Voice(
        id="uk-female-warm",
        name="Olivia",
        gender="female", age_range="young", accent="British", tone="warm",
        description="Warm British charm. Approachable yet polished.",
        sample_prompt="Hello! It's lovely to hear from you. I'm happy to help.",
        orpheus_speaker="tara",
        recommended_industries=["salon", "restaurant"],
        model_config=VoiceModelConfig(
            pitch_shift=1.2, speed=0.95, stability=0.5, style=0.5,
            warmth=0.75, breathiness=0.2, emotion_intensity=0.55,
        ),
    ),
    Voice(
        id="uk-female-casual",
        name="Poppy",
        gender="female", age_range="young", accent="British", tone="casual",
        description="Modern, casual British voice. Fresh and relatable.",
        sample_prompt="Alright, what can I do for you then? Let's get this sorted.",
        orpheus_speaker="jess",
        recommended_industries=["salon", "restaurant"],
        model_config=VoiceModelConfig(
            pitch_shift=1.0, speed=1.05, stability=0.45, style=0.55,
            warmth=0.6, breathiness=0.25, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="uk-female-authoritative",
        name="Eleanor",
        gender="female", age_range="middle-aged", accent="British", tone="authoritative",
        description="Authoritative British presence. Commands respect.",
        sample_prompt="I must emphasize the importance of your immediate attention to this.",
        orpheus_speaker="leah",
        recommended_industries=["legal"],
        model_config=VoiceModelConfig(
            pitch_shift=-0.5, speed=0.95, stability=0.7, style=0.3,
            warmth=0.35, breathiness=0.1, emotion_intensity=0.45,
        ),
    ),
    Voice(
        id="uk-male-professional",
        name="George",
        gender="male", age_range="middle-aged", accent="British", tone="professional",
        description="Distinguished British professional. Finance and corporate.",
        sample_prompt="Good morning. Let's discuss the details of your account.",
        orpheus_speaker="dan",
        recommended_industries=["legal", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.5, speed=0.95, stability=0.65, style=0.3,
            warmth=0.4, breathiness=0.1, emotion_intensity=0.4,
        ),
    ),
    Voice(
        id="uk-male-warm",
        name="William",
        gender="male", age_range="middle-aged", accent="British", tone="warm",
        description="Warm British gentleman. Builds trust naturally.",
        sample_prompt="Lovely to connect with you. I'm delighted to help.",
        orpheus_speaker="zac",
        recommended_industries=["dental", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.0, speed=0.95, stability=0.5, style=0.5,
            warmth=0.75, breathiness=0.2, emotion_intensity=0.55,
        ),
    ),
    Voice(
        id="uk-male-casual",
        name="Liam",
        gender="male", age_range="young", accent="British", tone="casual",
        description="Casual and modern British. Young and relatable.",
        sample_prompt="Alright mate, what can I do for you? Let's crack on.",
        orpheus_speaker="leo",
        recommended_industries=["automotive"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.5, speed=1.05, stability=0.45, style=0.55,
            warmth=0.6, breathiness=0.2, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="uk-male-deep",
        name="Benedict",
        gender="male", age_range="middle-aged", accent="British", tone="deep",
        description="Deep, resonant British voice. Gravitas and authority.",
        sample_prompt="This matter demands your utmost consideration.",
        orpheus_speaker="dan",
        recommended_industries=["legal"],
        model_config=VoiceModelConfig(
            pitch_shift=-4.0, speed=0.9, stability=0.7, style=0.25,
            warmth=0.3, breathiness=0.1, emotion_intensity=0.5,
        ),
    ),

    # -----------------------------------------------------------------------
    # AUSTRALIAN VOICES
    # -----------------------------------------------------------------------

    Voice(
        id="au-female-friendly",
        name="Chloe",
        gender="female", age_range="young", accent="Australian", tone="friendly",
        description="Friendly Australian warmth. Down-to-earth and genuine.",
        sample_prompt="G'day! Nice to chat. What can I help you with today?",
        orpheus_speaker="tara",
        recommended_industries=["salon", "restaurant", "default"],
        model_config=VoiceModelConfig(
            pitch_shift=1.3, speed=1.0, stability=0.5, style=0.55,
            warmth=0.7, breathiness=0.25, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="au-female-professional",
        name="Isabella",
        gender="female", age_range="middle-aged", accent="Australian", tone="professional",
        description="Professional Australian. Warm yet business-focused.",
        sample_prompt="Thank you for reaching out. I'm here to ensure your satisfaction.",
        orpheus_speaker="leah",
        recommended_industries=["real_estate", "medical"],
        model_config=VoiceModelConfig(
            pitch_shift=0.5, speed=1.0, stability=0.6, style=0.4,
            warmth=0.6, breathiness=0.15, emotion_intensity=0.5,
        ),
    ),
    Voice(
        id="au-male-friendly",
        name="Oliver",
        gender="male", age_range="young", accent="Australian", tone="friendly",
        description="Friendly Australian mate. Casual and approachable.",
        sample_prompt="G'day mate! Happy to help you out with whatever you need.",
        orpheus_speaker="leo",
        recommended_industries=["automotive", "plumbing", "hvac"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.5, speed=1.0, stability=0.5, style=0.55,
            warmth=0.7, breathiness=0.2, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="au-male-professional",
        name="Jack",
        gender="male", age_range="middle-aged", accent="Australian", tone="professional",
        description="Professional Australian. Reliable and competent.",
        sample_prompt="Thanks for calling. I'm committed to providing excellent service.",
        orpheus_speaker="dan",
        recommended_industries=["roofing", "real_estate"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.0, speed=1.0, stability=0.6, style=0.4,
            warmth=0.6, breathiness=0.15, emotion_intensity=0.5,
        ),
    ),

    # -----------------------------------------------------------------------
    # SPANISH-ACCENTED VOICES (bilingual market)
    # -----------------------------------------------------------------------

    Voice(
        id="es-female-warm",
        name="Maria",
        gender="female", age_range="middle-aged", accent="Spanish", tone="warm",
        description="Warm bilingual voice. Naturally switches between English and Spanish.",
        sample_prompt="Hola! Hi there! How can I help you today? Como puedo ayudarle?",
        orpheus_speaker="tara",
        recommended_industries=["dental", "medical", "restaurant", "default"],
        model_config=VoiceModelConfig(
            pitch_shift=1.0, speed=0.95, stability=0.5, style=0.5,
            warmth=0.85, breathiness=0.2, emotion_intensity=0.65,
        ),
    ),
    Voice(
        id="es-male-professional",
        name="Carlos",
        gender="male", age_range="middle-aged", accent="Spanish", tone="professional",
        description="Professional bilingual voice. Trusted and competent.",
        sample_prompt="Thank you for calling. How may I assist you today?",
        orpheus_speaker="dan",
        recommended_industries=["legal", "automotive", "roofing"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.0, speed=0.95, stability=0.6, style=0.4,
            warmth=0.6, breathiness=0.15, emotion_intensity=0.5,
        ),
    ),

    # -----------------------------------------------------------------------
    # GENDER-NEUTRAL / INCLUSIVE VOICES
    # -----------------------------------------------------------------------

    Voice(
        id="neutral-professional",
        name="Casey",
        gender="neutral", age_range="young", accent="American", tone="professional",
        description="Professional and inclusive. Modern brand voice.",
        sample_prompt="Welcome. I'm here to provide you with professional assistance.",
        orpheus_speaker="tara",
        recommended_industries=["default"],
        model_config=VoiceModelConfig(
            pitch_shift=0.0, speed=1.0, stability=0.6, style=0.35,
            warmth=0.5, breathiness=0.2, emotion_intensity=0.45,
        ),
    ),
    Voice(
        id="neutral-friendly",
        name="Alex",
        gender="neutral", age_range="young", accent="American", tone="friendly",
        description="Friendly and approachable. Works for any brand.",
        sample_prompt="Hi there! I'm excited to help you today. What brings you in?",
        orpheus_speaker="tara",
        recommended_industries=["default", "salon"],
        model_config=VoiceModelConfig(
            pitch_shift=0.5, speed=1.0, stability=0.5, style=0.5,
            warmth=0.7, breathiness=0.25, emotion_intensity=0.6,
        ),
    ),

    # -----------------------------------------------------------------------
    # INDUSTRY-OPTIMIZED SPECIALTY VOICES
    # -----------------------------------------------------------------------

    Voice(
        id="industry-hvac-tech",
        name="Jake",
        gender="male", age_range="middle-aged", accent="American", tone="knowledgeable",
        description="HVAC specialist voice. Knowledgeable but approachable. "
                    "Callers trust his expertise on heating, cooling, and air quality.",
        sample_prompt="I can definitely help with that. Let me ask a couple questions to figure out "
                      "the best solution for your system.",
        orpheus_speaker="zac",
        recommended_industries=["hvac"],
        model_config=VoiceModelConfig(
            pitch_shift=-1.5, speed=0.95, stability=0.55, style=0.45,
            warmth=0.7, breathiness=0.2, emotion_intensity=0.5,
        ),
    ),
    Voice(
        id="industry-dental-coordinator",
        name="Lisa",
        gender="female", age_range="young", accent="American", tone="gentle",
        description="Dental office coordinator. Gentle and reassuring. "
                    "Puts nervous patients at ease while efficiently scheduling.",
        sample_prompt="I completely understand. We'll make sure you're comfortable. "
                      "Let me find the perfect time for your appointment.",
        orpheus_speaker="mia",
        recommended_industries=["dental"],
        model_config=VoiceModelConfig(
            pitch_shift=1.0, speed=0.9, stability=0.6, style=0.4,
            warmth=0.85, breathiness=0.3, emotion_intensity=0.6,
        ),
    ),
    Voice(
        id="industry-plumbing-dispatch",
        name="Mike",
        gender="male", age_range="middle-aged", accent="American", tone="direct",
        description="Plumbing dispatcher. Gets to the point fast. "
                    "Callers with emergencies need quick, confident answers.",
        sample_prompt="Got it. I'm going to get someone out to you as quickly as possible. "
                      "Let me confirm your address.",
        orpheus_speaker="dan",
        recommended_industries=["plumbing"],
        model_config=VoiceModelConfig(
            pitch_shift=-2.0, speed=1.05, stability=0.6, style=0.35,
            warmth=0.5, breathiness=0.1, emotion_intensity=0.5,
        ),
    ),
    Voice(
        id="industry-medical-receptionist",
        name="Grace",
        gender="female", age_range="middle-aged", accent="American", tone="caring",
        description="Medical office receptionist. Calm, caring, HIPAA-aware. "
                    "Handles sensitive health topics with discretion.",
        sample_prompt="Of course. I understand this is important to you. "
                      "Let me check our next available appointment.",
        orpheus_speaker="mia",
        recommended_industries=["medical"],
        model_config=VoiceModelConfig(
            pitch_shift=0.3, speed=0.88, stability=0.65, style=0.3,
            warmth=0.8, breathiness=0.25, emotion_intensity=0.5,
        ),
    ),
]


# ===========================================================================
# Voice Manager
# ===========================================================================

class VoiceManager:
    """Manager for accessing, searching, and extending the voice library."""

    def __init__(self):
        self.voices: Dict[str, Voice] = {v.id: v for v in VOICE_LIBRARY}
        logger.info(f"VoiceManager: {len(self.voices)} voices loaded")

    def get_voice(self, voice_id: str) -> Optional[Voice]:
        return self.voices.get(voice_id)

    def list_voices(self) -> List[Voice]:
        return list(self.voices.values())

    def search_voices(
        self,
        gender: Optional[str] = None,
        accent: Optional[str] = None,
        tone: Optional[str] = None,
        age_range: Optional[str] = None,
        industry: Optional[str] = None,
    ) -> List[Voice]:
        results = self.list_voices()
        if gender:
            results = [v for v in results if v.gender == gender]
        if accent:
            results = [v for v in results if v.accent.lower() == accent.lower()]
        if tone:
            results = [v for v in results if v.tone == tone]
        if age_range:
            results = [v for v in results if v.age_range == age_range]
        if industry:
            results = [v for v in results if industry in v.recommended_industries]
        return results

    def get_recommended_for_industry(self, industry: str) -> List[Voice]:
        """Get voices recommended for a specific industry."""
        return [v for v in self.list_voices() if industry in v.recommended_industries]

    def add_cloned_voice(
        self,
        voice_id: str,
        name: str,
        description: str,
        reference_path: str,
    ):
        """Add a cloned voice to the library."""
        voice = Voice(
            id=voice_id,
            name=name,
            gender="neutral",
            age_range="middle-aged",
            accent="American",
            tone="custom",
            description=description,
            sample_prompt=f"Hello, this is {name}. How can I help you today?",
            orpheus_speaker="tara",  # Base speaker for cloning
            recommended_industries=["default"],
            is_cloned=True,
            reference_audio_path=reference_path,
            model_config=VoiceModelConfig(
                speed=1.0, stability=0.5, style=0.4, warmth=0.5,
            ),
        )
        self.voices[voice_id] = voice
        logger.info(f"Added cloned voice: {voice_id} ({name})")

    def export_json(self) -> str:
        return json.dumps([v.to_dict() for v in self.list_voices()], indent=2)

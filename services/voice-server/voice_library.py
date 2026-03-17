"""
Voice library definitions for the self-hosted voice synthesis system.
Contains 30+ diverse voices with metadata and model configurations.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class VoiceModelConfig:
    """Model configuration for voice synthesis."""
    pitch_shift: float = 0.0  # -12 to 12 semitones
    speed: float = 1.0  # 0.5 to 2.0
    stability: float = 0.5  # 0 to 1, higher = more consistent
    style: float = 0.4  # 0 to 1, higher = more expressive
    warmth: float = 0.5  # 0 to 1, 0 = neutral, 1 = warm


@dataclass
class Voice:
    """Voice definition with metadata and model config."""
    id: str
    name: str
    gender: str  # "female", "male", "neutral"
    age_range: str  # "young", "middle-aged", "senior"
    accent: str  # "American", "British", "Australian"
    tone: str  # "warm", "professional", "casual", "energetic", etc.
    description: str
    sample_prompt: str  # Example text that sounds good in this voice
    model_config: VoiceModelConfig

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "gender": self.gender,
            "age_range": self.age_range,
            "accent": self.accent,
            "tone": self.tone,
            "description": self.description,
            "sample_prompt": self.sample_prompt,
            "model_config": {
                "pitch_shift": self.model_config.pitch_shift,
                "speed": self.model_config.speed,
                "stability": self.model_config.stability,
                "style": self.model_config.style,
                "warmth": self.model_config.warmth,
            }
        }


# American Female Voices
VOICE_LIBRARY: List[Voice] = [
    # Warm receptionist
    Voice(
        id="us-female-warm-receptionist",
        name="Sarah",
        gender="female",
        age_range="young",
        accent="American",
        tone="warm",
        description="Warm and welcoming receptionist voice. Perfect for greeting customers and making them feel valued.",
        sample_prompt="Hi there! Welcome to our company. How can I help you today?",
        model_config=VoiceModelConfig(
            pitch_shift=1.5,
            speed=0.95,
            stability=0.45,
            style=0.5,
            warmth=0.8
        )
    ),
    # Professional
    Voice(
        id="us-female-professional",
        name="Jennifer",
        gender="female",
        age_range="middle-aged",
        accent="American",
        tone="professional",
        description="Professional and articulate. Ideal for corporate communications and formal interactions.",
        sample_prompt="Thank you for contacting our office. I'll be happy to assist you with your inquiry.",
        model_config=VoiceModelConfig(
            pitch_shift=0.5,
            speed=1.0,
            stability=0.65,
            style=0.3,
            warmth=0.4
        )
    ),
    # Casual
    Voice(
        id="us-female-casual",
        name="Emma",
        gender="female",
        age_range="young",
        accent="American",
        tone="casual",
        description="Casual and approachable. Great for friendly conversations and relaxed settings.",
        sample_prompt="Hey! What's up? I'm here to help you out with anything you need.",
        model_config=VoiceModelConfig(
            pitch_shift=1.2,
            speed=1.05,
            stability=0.4,
            style=0.6,
            warmth=0.7
        )
    ),
    # Energetic
    Voice(
        id="us-female-energetic",
        name="Madison",
        gender="female",
        age_range="young",
        accent="American",
        tone="energetic",
        description="Energetic and upbeat. Perfect for promotions, events, and exciting announcements.",
        sample_prompt="Wow, you're going to love what we have to offer! Let me tell you all about it!",
        model_config=VoiceModelConfig(
            pitch_shift=2.0,
            speed=1.15,
            stability=0.35,
            style=0.75,
            warmth=0.6
        )
    ),
    # Calm
    Voice(
        id="us-female-calm",
        name="Rachel",
        gender="female",
        age_range="middle-aged",
        accent="American",
        tone="calm",
        description="Calm and reassuring. Excellent for healthcare, support, and sensitive topics.",
        sample_prompt="It's completely normal to feel this way. Let's talk through this together, at your pace.",
        model_config=VoiceModelConfig(
            pitch_shift=0.2,
            speed=0.85,
            stability=0.7,
            style=0.25,
            warmth=0.75
        )
    ),
    # Authoritative
    Voice(
        id="us-female-authoritative",
        name="Victoria",
        gender="female",
        age_range="middle-aged",
        accent="American",
        tone="authoritative",
        description="Authoritative and commanding. Suited for compliance, security, and executive communications.",
        sample_prompt="I need to inform you of important changes to your account. Please listen carefully.",
        model_config=VoiceModelConfig(
            pitch_shift=-1.0,
            speed=1.0,
            stability=0.65,
            style=0.35,
            warmth=0.3
        )
    ),
    # Friendly
    Voice(
        id="us-female-friendly",
        name="Holly",
        gender="female",
        age_range="young",
        accent="American",
        tone="friendly",
        description="Friendly and personable. Great for customer service and community engagement.",
        sample_prompt="It's so nice to connect with you! I'm really excited to help you find what you need.",
        model_config=VoiceModelConfig(
            pitch_shift=1.5,
            speed=1.0,
            stability=0.5,
            style=0.55,
            warmth=0.8
        )
    ),
    # Empathetic
    Voice(
        id="us-female-empathetic",
        name="Sophie",
        gender="female",
        age_range="middle-aged",
        accent="American",
        tone="empathetic",
        description="Empathetic and compassionate. Perfect for counseling, healthcare, and crisis support.",
        sample_prompt="I understand how important this is to you, and I'm here to support you every step of the way.",
        model_config=VoiceModelConfig(
            pitch_shift=0.5,
            speed=0.9,
            stability=0.6,
            style=0.45,
            warmth=0.85
        )
    ),

    # British Female Voices
    Voice(
        id="uk-female-professional",
        name="Charlotte",
        gender="female",
        age_range="middle-aged",
        accent="British",
        tone="professional",
        description="Professional British accent. Ideal for luxury brands and upscale services.",
        sample_prompt="Good afternoon. I'm delighted to be of service. How may I assist you?",
        model_config=VoiceModelConfig(
            pitch_shift=0.5,
            speed=0.95,
            stability=0.65,
            style=0.35,
            warmth=0.45
        )
    ),
    Voice(
        id="uk-female-warm",
        name="Olivia",
        gender="female",
        age_range="young",
        accent="British",
        tone="warm",
        description="Warm British accent with approachable charm. Great for hospitality and engagement.",
        sample_prompt="Hello! It's lovely to hear from you. I'm absolutely happy to help.",
        model_config=VoiceModelConfig(
            pitch_shift=1.2,
            speed=0.95,
            stability=0.5,
            style=0.5,
            warmth=0.75
        )
    ),
    Voice(
        id="uk-female-casual",
        name="Poppy",
        gender="female",
        age_range="young",
        accent="British",
        tone="casual",
        description="Casual British voice. Perfect for modern, youthful brands.",
        sample_prompt="Alright, what can I do for you then? Let's get this sorted out.",
        model_config=VoiceModelConfig(
            pitch_shift=1.0,
            speed=1.05,
            stability=0.45,
            style=0.55,
            warmth=0.6
        )
    ),
    Voice(
        id="uk-female-authoritative",
        name="Eleanor",
        gender="female",
        age_range="middle-aged",
        accent="British",
        tone="authoritative",
        description="Authoritative British accent. Suited for governance and executive communications.",
        sample_prompt="I must emphasize the importance of your immediate attention to this matter.",
        model_config=VoiceModelConfig(
            pitch_shift=-0.5,
            speed=0.95,
            stability=0.7,
            style=0.3,
            warmth=0.35
        )
    ),

    # Australian Female Voices
    Voice(
        id="au-female-friendly",
        name="Chloe",
        gender="female",
        age_range="young",
        accent="Australian",
        tone="friendly",
        description="Friendly Australian accent. Great for casual, modern communications.",
        sample_prompt="G'day! Nice to chat with you. What can I help you with today?",
        model_config=VoiceModelConfig(
            pitch_shift=1.3,
            speed=1.0,
            stability=0.5,
            style=0.55,
            warmth=0.7
        )
    ),
    Voice(
        id="au-female-professional",
        name="Isabella",
        gender="female",
        age_range="middle-aged",
        accent="Australian",
        tone="professional",
        description="Professional Australian accent with warmth. Ideal for business communications.",
        sample_prompt="Thank you for reaching out. I'm here to ensure your complete satisfaction.",
        model_config=VoiceModelConfig(
            pitch_shift=0.5,
            speed=1.0,
            stability=0.6,
            style=0.4,
            warmth=0.6
        )
    ),

    # American Male Voices
    Voice(
        id="us-male-confident",
        name="Adam",
        gender="male",
        age_range="middle-aged",
        accent="American",
        tone="confident",
        description="Confident and authoritative. Perfect for sales and persuasive communications.",
        sample_prompt="I'm confident that this is exactly what you're looking for. Let me explain why.",
        model_config=VoiceModelConfig(
            pitch_shift=-2.0,
            speed=1.0,
            stability=0.65,
            style=0.4,
            warmth=0.5
        )
    ),
    Voice(
        id="us-male-casual",
        name="Sam",
        gender="male",
        age_range="young",
        accent="American",
        tone="casual",
        description="Casual and approachable. Great for tech startups and modern brands.",
        sample_prompt="Hey, what's going on? I'm stoked to help you out with whatever you need.",
        model_config=VoiceModelConfig(
            pitch_shift=-1.5,
            speed=1.05,
            stability=0.4,
            style=0.6,
            warmth=0.6
        )
    ),
    Voice(
        id="us-male-professional",
        name="James",
        gender="male",
        age_range="middle-aged",
        accent="American",
        tone="professional",
        description="Professional and measured. Excellent for corporate and formal settings.",
        sample_prompt="Thank you for your business. We appreciate the opportunity to serve you.",
        model_config=VoiceModelConfig(
            pitch_shift=-2.5,
            speed=0.95,
            stability=0.65,
            style=0.3,
            warmth=0.45
        )
    ),
    Voice(
        id="us-male-warm",
        name="Michael",
        gender="male",
        age_range="middle-aged",
        accent="American",
        tone="warm",
        description="Warm and personable. Perfect for building connections and relationships.",
        sample_prompt="I really appreciate you taking the time to speak with me. How can I make your day better?",
        model_config=VoiceModelConfig(
            pitch_shift=-1.8,
            speed=0.95,
            stability=0.5,
            style=0.5,
            warmth=0.8
        )
    ),
    Voice(
        id="us-male-energetic",
        name="Nathan",
        gender="male",
        age_range="young",
        accent="American",
        tone="energetic",
        description="Energetic and passionate. Ideal for promotions and exciting announcements.",
        sample_prompt="This is absolutely incredible! You're going to be blown away by what we've got for you!",
        model_config=VoiceModelConfig(
            pitch_shift=-1.2,
            speed=1.15,
            stability=0.35,
            style=0.7,
            warmth=0.65
        )
    ),
    Voice(
        id="us-male-calm",
        name="Daniel",
        gender="male",
        age_range="middle-aged",
        accent="American",
        tone="calm",
        description="Calm and measured. Great for healthcare and sensitive communications.",
        sample_prompt="Let's take this step by step. I'll be right here with you through the entire process.",
        model_config=VoiceModelConfig(
            pitch_shift=-2.0,
            speed=0.85,
            stability=0.7,
            style=0.25,
            warmth=0.75
        )
    ),
    Voice(
        id="us-male-deep",
        name="Marcus",
        gender="male",
        age_range="middle-aged",
        accent="American",
        tone="deep",
        description="Deep and commanding presence. Perfect for executive communications and authority.",
        sample_prompt="This requires your immediate and undivided attention.",
        model_config=VoiceModelConfig(
            pitch_shift=-4.0,
            speed=0.95,
            stability=0.65,
            style=0.3,
            warmth=0.35
        )
    ),
    Voice(
        id="us-male-friendly",
        name="Chris",
        gender="male",
        age_range="young",
        accent="American",
        tone="friendly",
        description="Friendly and approachable. Great for outbound calling and engagement.",
        sample_prompt="Hey! I'm really glad I caught you. I think you're going to like what I have to share.",
        model_config=VoiceModelConfig(
            pitch_shift=-1.5,
            speed=1.0,
            stability=0.5,
            style=0.55,
            warmth=0.75
        )
    ),

    # British Male Voices
    Voice(
        id="uk-male-professional",
        name="George",
        gender="male",
        age_range="middle-aged",
        accent="British",
        tone="professional",
        description="Professional British accent. Ideal for finance and corporate communications.",
        sample_prompt="Good morning. I trust you're well. Let's discuss the particulars of your account.",
        model_config=VoiceModelConfig(
            pitch_shift=-2.5,
            speed=0.95,
            stability=0.65,
            style=0.3,
            warmth=0.4
        )
    ),
    Voice(
        id="uk-male-warm",
        name="William",
        gender="male",
        age_range="middle-aged",
        accent="British",
        tone="warm",
        description="Warm British accent with charm. Perfect for building rapport.",
        sample_prompt="Lovely to connect with you. I'm delighted to help in any way I can.",
        model_config=VoiceModelConfig(
            pitch_shift=-2.0,
            speed=0.95,
            stability=0.5,
            style=0.5,
            warmth=0.75
        )
    ),
    Voice(
        id="uk-male-casual",
        name="Liam",
        gender="male",
        age_range="young",
        accent="British",
        tone="casual",
        description="Casual British accent. Great for youthful, modern brands.",
        sample_prompt="Alright mate, what can I do for you? Let's crack on with this.",
        model_config=VoiceModelConfig(
            pitch_shift=-1.5,
            speed=1.05,
            stability=0.45,
            style=0.55,
            warmth=0.6
        )
    ),
    Voice(
        id="uk-male-deep",
        name="Benedict",
        gender="male",
        age_range="middle-aged",
        accent="British",
        tone="deep",
        description="Deep, authoritative British accent. Perfect for gravitas and prestige.",
        sample_prompt="This matter demands your utmost consideration and immediate action.",
        model_config=VoiceModelConfig(
            pitch_shift=-4.0,
            speed=0.9,
            stability=0.7,
            style=0.25,
            warmth=0.3
        )
    ),

    # Australian Male Voices
    Voice(
        id="au-male-friendly",
        name="Oliver",
        gender="male",
        age_range="young",
        accent="Australian",
        tone="friendly",
        description="Friendly Australian accent. Great for casual, down-to-earth communications.",
        sample_prompt="G'day mate! Happy to help you out with whatever you need.",
        model_config=VoiceModelConfig(
            pitch_shift=-1.5,
            speed=1.0,
            stability=0.5,
            style=0.55,
            warmth=0.7
        )
    ),
    Voice(
        id="au-male-professional",
        name="Jack",
        gender="male",
        age_range="middle-aged",
        accent="Australian",
        tone="professional",
        description="Professional Australian accent. Ideal for business-focused interactions.",
        sample_prompt="Thank you for contacting us. I'm committed to providing you with excellent service.",
        model_config=VoiceModelConfig(
            pitch_shift=-2.0,
            speed=1.0,
            stability=0.6,
            style=0.4,
            warmth=0.6
        )
    ),

    # Gender-neutral/Androgynous Voices
    Voice(
        id="neutral-professional",
        name="Casey",
        gender="neutral",
        age_range="young",
        accent="American",
        tone="professional",
        description="Professional and inclusive. Perfect for modern, inclusive brand communications.",
        sample_prompt="Welcome. I'm here to provide you with professional assistance.",
        model_config=VoiceModelConfig(
            pitch_shift=0.0,
            speed=1.0,
            stability=0.6,
            style=0.35,
            warmth=0.5
        )
    ),
    Voice(
        id="neutral-friendly",
        name="Alex",
        gender="neutral",
        age_range="young",
        accent="American",
        tone="friendly",
        description="Friendly and approachable. Great for diverse and inclusive teams.",
        sample_prompt="Hi there! I'm excited to help you today. What brings you in?",
        model_config=VoiceModelConfig(
            pitch_shift=0.5,
            speed=1.0,
            stability=0.5,
            style=0.5,
            warmth=0.7
        )
    ),
]


class VoiceManager:
    """Manager for accessing and retrieving voice definitions."""

    def __init__(self):
        self.voices: Dict[str, Voice] = {voice.id: voice for voice in VOICE_LIBRARY}
        logger.info(f"Initialized VoiceManager with {len(self.voices)} voices")

    def get_voice(self, voice_id: str) -> Optional[Voice]:
        """Get a voice by ID."""
        return self.voices.get(voice_id)

    def list_voices(self) -> List[Voice]:
        """List all available voices."""
        return list(self.voices.values())

    def search_voices(
        self,
        gender: Optional[str] = None,
        accent: Optional[str] = None,
        tone: Optional[str] = None,
        age_range: Optional[str] = None,
    ) -> List[Voice]:
        """Search voices by criteria."""
        results = self.list_voices()

        if gender:
            results = [v for v in results if v.gender == gender]
        if accent:
            results = [v for v in results if v.accent == accent]
        if tone:
            results = [v for v in results if v.tone == tone]
        if age_range:
            results = [v for v in results if v.age_range == age_range]

        return results

    def export_voices_json(self) -> str:
        """Export all voices as JSON."""
        return json.dumps(
            [voice.to_dict() for voice in self.list_voices()],
            indent=2
        )

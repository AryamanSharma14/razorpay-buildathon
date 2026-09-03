import os
import json
import time
from pathlib import Path
from elevenlabs.client import ElevenLabs
from mutagen.mp3 import MP3

API_KEY = "sk_0546829ac730f6aa7557f25b7a1ffae6a0886fa614b258aa"
OUT_DIR = Path("build/demo_assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Voice: Charlie (IKne3meq5aSn9XLyUdCD) or George (JBFqnCBsd6RMkjVDRZzb)
VOICE_ID = "IKne3meq5aSn9XLyUdCD" # Charlie - Deep, confident, energetic

SCENES = [
    {
        "id": "scene1_intro",
        "title": "Introduction & Overview",
        "text": (
            "Every year, subscription businesses lose billions to failed recurring payments. "
            "Standard recovery tools rely on blind 24-hour retries that burn customer trust and trigger heavy card network violation penalties. "
            "Welcome to Razorpay Smart Recovery — an intelligent, compliance-first revenue recovery engine built for high-growth merchants, "
            "delivering a verified plus fifteen point six percent recovery rate lift over standard controls."
        )
    },
    {
        "id": "scene2_smart_retry",
        "title": "ML Smart Retries & Cat-1 Compliance",
        "text": (
            "Instead of rigid schedules, our Gradient Boosting model evaluates elapsed failure time, card networks, and historical recovery curves to pinpoint the exact hour for maximum success. "
            "For soft declines like low balance, it intelligently reschedules the retry. "
            "And when a hard decline occurs, such as a stolen or expired card, our strict Visa Category 1 guard blocks retries immediately with zero reattempts, completely eliminating regulatory fines."
        )
    },
    {
        "id": "scene3_whatsapp_nudge",
        "title": "TRAI-Compliant AI WhatsApp Nudges",
        "text": (
            "When direct payment link intervention is required, the AI agent generates tailored, urgency-aware WhatsApp and SMS payment links. "
            "Fully compliant with TRAI service-messaging regulations, it never spams with promotional clutter, giving customers a seamless one-click Razorpay checkout to instantly settle their invoice."
        )
    },
    {
        "id": "scene4_economics_audit",
        "title": "Unit Economics & Immutable Audit",
        "text": (
            "Every decision is fully transparent. The Unit Economics dashboard tracks real net revenue recovered after messaging fees, proving genuine positive expected value. "
            "Meanwhile, an immutable audit log captures every machine learning probability sweep, downtime hold, and AI reasoning payload for complete regulatory compliance."
        )
    },
    {
        "id": "scene5_conclusion",
        "title": "Conclusion & Architecture",
        "text": (
            "With high-throughput webhook processing, intelligent bank downtime circuit breakers, and zero-downtime offline fallback, "
            "Razorpay Smart Recovery turns lost recurring revenue into predictable cash flow. "
            "Thank you."
        )
    }
]

def generate_voiceovers():
    client = ElevenLabs(api_key=API_KEY)
    manifest = []
    
    print("Generating ElevenLabs voiceover clips...")
    for i, scene in enumerate(SCENES):
        mp3_path = OUT_DIR / f"{scene['id']}.mp3"
        print(f"[{i+1}/{len(SCENES)}] Generating voice for: {scene['title']}...")
        
        audio = client.text_to_speech.convert(
            voice_id=VOICE_ID,
            text=scene['text'],
            model_id="eleven_multilingual_v2",
        )
        
        with open(mp3_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)
                
        audio_info = MP3(mp3_path)
        duration = audio_info.info.length
        print(f"  -> Saved {mp3_path.name} (Duration: {duration:.2f}s)")
        
        manifest.append({
            "id": scene["id"],
            "title": scene["title"],
            "file": str(mp3_path.resolve()),
            "duration": duration,
            "text": scene["text"]
        })
        
    with open(OUT_DIR / "voice_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
        
    print("\nAll audio clips generated successfully!")
    return manifest

if __name__ == "__main__":
    generate_voiceovers()

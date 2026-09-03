import os
import sys
import json
import time
import subprocess
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings
from mutagen.mp3 import MP3
import imageio_ffmpeg

API_KEY = "sk_0546829ac730f6aa7557f25b7a1ffae6a0886fa614b258aa"
OUT_DIR = Path("build/demo_assets_4min")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Charlie - Deep, confident, energetic tech founder tone
VOICE_ID = "IKne3meq5aSn9XLyUdCD"

# 4-Minute Master Pitch Script (6 Acts)
SCENES = [
    {
        "id": "scene1_hook_overview",
        "title": "Act 1: The Hook & Executive Telemetry",
        "text": (
            "Picture this: Friday at 11:30 PM. A customer attempts a ₹1,499 Cult.fit annual subscription. "
            "The card declines due to insufficient funds because salary hasn't credited yet. "
            "Standard gateways instantly fire a dumb automated SMS saying 'Payment Failed, Retry Now!' "
            "The customer clicks it, it fails again, burns card retry caps, and that ₹1,499 sale is abandoned forever. "
            "In India alone, checkout drop-offs cost merchants over ₹10,000 Crores every year. "
            "We built Razorpay Autonomous Recovery Agent — an intelligent orchestrator replacing blind retries "
            "with predictive ML timing, regulatory penalty shields, and frictionless WhatsApp UPI routing."
        )
    },
    {
        "id": "scene2_showcase_tour",
        "title": "Act 2: The 30s Guided Showcase Tour",
        "text": (
            "Let’s watch the entire autonomous recovery lifecycle execute in our built-in 30-Second Guided Tour. "
            "First: A ₹1,499 checkout fails on an HDFC card. Our agent intercepts the webhook in milliseconds instead of firing a premature retry. "
            "Second: The GradientBoosting engine evaluates 240 hours of recovery mass, identifies the Friday morning salary deposit window, "
            "and schedules the retry with an 84% success probability. "
            "Third: On Friday, the customer receives an official verified WhatsApp notification with a 1-tap UPI link — completing payment in 3 seconds. "
            "Fourth: The policy engine shields the merchant from illegal permanent retries, eliminating Visa Category-1 fines. "
            "Across 10,000 monthly failures, this autonomous lift generates an extra ₹18.4 Lakhs in net annual merchant profit."
        )
    },
    {
        "id": "scene3_decision_trace",
        "title": "Act 3: 6-Stage Decision Pipeline & Explainability",
        "text": (
            "Every single recovery decision is 100% transparent through this interactive 6-Stage Decision Pipeline. "
            "Webhook Ingestion extracts card BIN, issuer, and decline reasons. "
            "The Regulatory Shield enforces Visa and Mastercard rules. "
            "The ML Horizon Scanner evaluates the 240-hour probability curve. "
            "Dynamic Snapping shifts retries past bank downtime and aligns with payday. "
            "Multi-Rail Routing switches from failing cards to WhatsApp UPI. "
            "And Smart Nudge Dispatch sends an empathetic, TRAI-compliant service link. "
            "Every single step provides auditable mathematical explainability for developers and risk teams."
        )
    },
    {
        "id": "scene4_policy_sandbox",
        "title": "Act 4: Regulatory Shield & Enterprise Guardrails",
        "text": (
            "Visa penalizes merchants ₹8.30 per illegal retry on permanent card declines, "
            "while Mastercard charges up to ₹41.50 for excessive retry spam. "
            "In our 2,000-transaction holdout benchmark, aggressive bots racked up heavy fines and risked merchant account suspension. "
            "Our agent blocked 18 expired cards before they touched card rails — saving ₹149 in direct penalties while delivering a +15.6 point recovery advantage. "
            "In Merchant Guardrails, enterprises have full control: enforce TRAI quiet hours from 9 PM to 9 AM, "
            "enable automatic Card-to-UPI rerouting, and set minimum expected value thresholds to avoid wasting messaging fees on sub-economic ₹1 micro-charges."
        )
    },
    {
        "id": "scene5_developer_hub",
        "title": "Act 5: Developer Gateway Hub & Thought Terminal",
        "text": (
            "For developers, the Gateway Integration Hub provides the live webhook URL, subscribed event schemas, "
            "and copy-paste SDK snippets in Node.js, Python, and cURL — with a live ping tester confirming 12ms latency. "
            "Developers can also press 'T' anywhere in the app to open the Agent Thought Terminal — "
            "streaming real-time Server-Sent Events showing exact payload transformations as checkouts decline and recover."
        )
    },
    {
        "id": "scene6_cfo_economics",
        "title": "Act 6: CFO Unit Economics & Closing",
        "text": (
            "Now let’s examine the financial bottom line in ROI & Economics. "
            "WhatsApp utility notifications cost ₹0.35; SMS costs ₹0.15. "
            "On this batch, we spent ₹10.15 on messaging to recover ₹26,882 in net GMV. "
            "That is an astounding 2,648× Return on Messaging Spend. "
            "With one tap on Executive Board Brief, finance teams get a print-ready board presentation detailing recovery margins and compliance. "
            "By combining predictive ML, automated compliance shields, and 1-tap WhatsApp UPI routing, "
            "Razorpay merchants recover more revenue, faster, with zero churn. Thank you!"
        )
    }
]

def generate_voiceovers():
    client = ElevenLabs(api_key=API_KEY)
    manifest = []
    
    total_chars = sum(len(s['text']) for s in SCENES)
    print(f"🎙️ Generating 4-Minute ElevenLabs Voiceover ({len(SCENES)} scenes, {total_chars} chars)...")
    print("⚡ Settings: speed=1.12, stability=0.45, similarity=0.78 (Realistic & Accelerated)")

    # Conversational, humanized voice settings with speedup
    settings = VoiceSettings(
        stability=0.45,         # Natural inflection & prosody variance
        similarity_boost=0.78,  # High audio presence & voice fidelity
        style=0.15,             # Subtle conversational swagger
        use_speaker_boost=True, # Full broadcasting resonance
        speed=1.12              # ⚡ 12% faster delivery
    )

    for i, scene in enumerate(SCENES):
        mp3_path = OUT_DIR / f"{scene['id']}.mp3"
        print(f"[{i+1}/{len(SCENES)}] Synthesizing: {scene['title']} ({len(scene['text'])} chars)...")
        
        audio = client.text_to_speech.convert(
            voice_id=VOICE_ID,
            text=scene['text'],
            model_id="eleven_multilingual_v2",
            voice_settings=settings
        )
        
        with open(mp3_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)
                
        audio_info = MP3(mp3_path)
        duration = audio_info.info.length
        print(f"  -> Saved {mp3_path.name} ({duration:.2f}s)")
        
        manifest.append({
            "id": scene["id"],
            "title": scene["title"],
            "file": str(mp3_path.resolve()),
            "duration": duration,
            "text": scene["text"]
        })
        
    manifest_path = OUT_DIR / "voice_manifest_4min.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Stitch into master audio
    print("\n🔗 Stitching audio tracks into master file...")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    concat_file = OUT_DIR / "concat.txt"
    with open(concat_file, "w", encoding="utf-8") as f:
        for item in manifest:
            f_path = Path(item["file"]).resolve().as_posix()
            f.write(f"file '{f_path}'\n")

    master_audio = OUT_DIR / "demo_4min_master_audio.mp3"
    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(master_audio)]
    subprocess.run(cmd, check=True)

    full_info = MP3(master_audio)
    total_duration = full_info.info.length
    print(f"🎉 Master audio stitched: {master_audio}")
    print(f"⏱️ Total duration: {total_duration:.2f}s ({total_duration/60:.2f} minutes)\n")
    return manifest, total_duration

if __name__ == "__main__":
    generate_voiceovers()

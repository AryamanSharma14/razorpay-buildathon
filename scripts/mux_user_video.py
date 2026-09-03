import os
import sys
import glob
import shutil
import subprocess
from pathlib import Path
import imageio_ffmpeg
from mutagen.mp3 import MP3

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    root = Path(__file__).parent.parent.resolve()
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Locate user capture
    captures_dir = Path(r"C:\Users\aryam\Videos\Captures")
    mp4s = list(captures_dir.glob("*.mp4"))
    if not mp4s:
        print("[ERROR] No mp4 files found in C:\\Users\\aryam\\Videos\\Captures")
        sys.exit(1)
    
    # Sort by modification time to get the newest
    mp4s.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    user_video = mp4s[0]
    print(f"🎬 Found user screen recording: {user_video.name} ({user_video.stat().st_size / (1024*1024):.2f} MB)")

    # Master audio
    audio_path = root / "build" / "demo_assets_4min" / "demo_4min_master_audio.mp3"
    if not audio_path.exists():
        audio_path = root / "demo_audio.mp3"
    
    audio_info = MP3(audio_path)
    audio_duration = audio_info.info.length
    print(f"🎙️ Master audio: {audio_path.name} ({audio_duration:.2f}s)")

    output_root = root / "demo_video.mp4"
    output_4min = root / "demo_video_4min.mp4"
    output_build = root / "build" / "demo_video.mp4"

    # Mux using FFmpeg:
    # Use tpad so the final frame of the video holds nicely if audio is slightly longer,
    # and encode to standard 1080p yuv420p mp4 for maximum compatibility.
    print(f"⚙️ Muxing into {output_root.name}...")
    cmd = [
        ffmpeg, "-y",
        "-i", str(user_video),
        "-i", str(audio_path),
        "-filter_complex", "[0:v]tpad=stop_mode=clone:stop_duration=5[v]",
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(output_root)
    ]
    subprocess.run(cmd, check=True)

    shutil.copy2(output_root, output_4min)
    shutil.copy2(output_root, output_build)

    file_size_mb = output_root.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 60)
    print("DEMO VIDEO PRODUCTION COMPLETE!")
    print(f"Output File: {output_root}")
    print(f"Duration:    {audio_duration:.2f}s (~{audio_duration/60:.2f} min)")
    print(f"File Size:   {file_size_mb:.2f} MB")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()

import os
import sys
import json
import time
import shutil
import subprocess
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import imageio_ffmpeg
from mutagen.mp3 import MP3

def main():
    root_dir = Path(__file__).parent.parent.resolve()
    assets_dir = root_dir / "build" / "demo_assets"
    raw_video_dir = root_dir / "build" / "raw_video"
    master_audio = assets_dir / "demo_full_audio.mp3"
    build_mp4 = root_dir / "build" / "demo_video.mp4"
    root_mp4 = root_dir / "demo_video.mp4"

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"[1/5] FFmpeg executable: {ffmpeg}")

    # 1. Verify Master Audio
    if not master_audio.exists():
        print("[2/5] Master audio not found, stitching now...")
        subprocess.run([sys.executable, str(root_dir / "scripts" / "stitch_audio.py")], check=True, cwd=root_dir)
    
    audio_info = MP3(master_audio)
    audio_duration = audio_info.info.length
    print(f"[2/5] Master audio verified: {audio_duration:.2f}s ({master_audio.name})")

    # 2. Verify FastAPI server is running
    import urllib.request
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/ping", timeout=3) as res:
            data = json.loads(res.read().decode())
            print(f"[3/5] FastAPI backend running: {data}")
    except Exception as e:
        print(f"[ERROR] Backend not responding on http://127.0.0.1:8000/ping: {e}")
        print("Please start the backend before running export.")
        sys.exit(1)

    # 3. Run Playwright Browser Recorder
    print("[4/5] Running Playwright browser recording script (1920x1080, ~114s)...")
    recorder_script = root_dir / "scripts" / "record_demo_video.cjs"
    result = subprocess.run(["node", str(recorder_script)], cwd=root_dir)
    if result.returncode != 0:
        print("[ERROR] Playwright recording failed.")
        sys.exit(1)

    # 4. Locate recorded .webm video
    raw_videos = list(raw_video_dir.glob("*.webm"))
    if not raw_videos:
        print(f"[ERROR] No .webm files found in {raw_video_dir}")
        sys.exit(1)
    
    # Sort by modification time to get newest
    raw_videos.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    raw_video = raw_videos[0]
    print(f"[5/5] Found raw recording: {raw_video} ({raw_video.stat().st_size / (1024*1024):.2f} MB)")

    # 5. FFmpeg Muxing into 1080p MP4
    print(f"[5/5] Muxing video and audio into {build_mp4}...")
    cmd = [
        ffmpeg, "-y",
        "-i", str(raw_video),
        "-i", str(master_audio),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(build_mp4)
    ]
    subprocess.run(cmd, check=True)

    # 6. Copy to root directory
    shutil.copy2(build_mp4, root_mp4)
    file_size_mb = root_mp4.stat().st_size / (1024 * 1024)

    print("\n" + "=" * 60)
    print("DEMO VIDEO EXPORT COMPLETE!")
    print(f"Output file: {root_mp4}")
    print(f"Build copy:  {build_mp4}")
    print(f"File size:   {file_size_mb:.2f} MB")
    print(f"Duration:    {audio_duration:.2f}s (~1m 54s)")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()

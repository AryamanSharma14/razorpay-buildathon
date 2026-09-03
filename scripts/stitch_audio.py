import json
import subprocess
from pathlib import Path
import imageio_ffmpeg
from mutagen.mp3 import MP3

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
assets_dir = Path("build/demo_assets")
manifest_path = assets_dir / "voice_manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

concat_file = assets_dir / "concat.txt"
with open(concat_file, "w", encoding="utf-8") as f:
    for item in manifest:
        f_path = Path(item["file"]).resolve().as_posix()
        f.write(f"file '{f_path}'\n")

out_audio = assets_dir / "demo_full_audio.mp3"
cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(out_audio)]
subprocess.run(cmd, check=True)

full_info = MP3(out_audio)
print(f"Combined audio duration: {full_info.info.length:.2f}s")
print(f"Saved to: {out_audio}")

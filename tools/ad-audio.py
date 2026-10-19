#!/usr/bin/env python3
"""Narration for the Icelus ad: an ElevenLabs voice reads each line, tools/ad-music.py is the bed, and ffmpeg
puts every line on its cue, ducks the bed under the voice and writes mix.wav. Run from the repo root:
python3 tools/ad-audio.py OUT_DIR   (the key is read from ~/.config/fish/secrets.fish and never printed)."""
import os, re, json, subprocess, sys, urllib.request
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/icelus-ad-audio"
REPO = os.getcwd(); os.makedirs(OUT, exist_ok=True); os.chdir(OUT)
key = re.search(r"ELEVENLABS_API_KEY ['\"]?([^'\" \n]+)", open(os.path.expanduser("~/.config/fish/secrets.fish")).read()).group(1)
VOICE = "EXAVITQu4vr4xnSDxMaL"
# (id, start seconds, line): cues match the scenes in landing/ad/index.html
LINES = [("a", 0.5, "Most design tools hand you a picture."), ("b", 3.0, "Icelus hands you text."),
 ("c", 5.7, "Pick a part. Stamp it on the grid."), ("d", 9.6, "Or let your assistant draw it with you."),
 ("e", 13.6, "Move anything. Undo anything."), ("f", 19.5, "Then paste it anywhere."),
 ("g", 21.1, "A pull request."), ("h", 22.45, "A chat. A readme."), ("i", 25.6, "Icelus. Sketch a screen in plain text.")]
for k, _, t in LINES:
    if os.path.exists(f"{k}.mp3"): continue  # a re-run keeps voiced lines; delete a clip to re-voice it
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=json.dumps({"text": t, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.55, "similarity_boost": 0.75, "style": 0.15}}).encode(),
        headers={"xi-api-key": key, "content-type": "application/json", "accept": "audio/mpeg"})
    open(f"{k}.mp3", "wb").write(urllib.request.urlopen(req, timeout=60).read())
subprocess.run([sys.executable, os.path.join(REPO, "tools/ad-music.py")], check=True)
ins = sum([["-i", f"{k}.mp3"] for k, _, _ in LINES], []) + ["-i", "music.wav"]
vo = "".join(f"[{i}]aformat=sample_rates=44100:channel_layouts=mono,adelay={int(s*1000)}[{k}];" for i, (k, s, _) in enumerate(LINES))
fc = (vo + "".join(f"[{k}]" for k, _, _ in LINES) + f"amix=inputs={len(LINES)}:normalize=0,apad=whole_dur=30,asplit[v1][v2];"
 f"[{len(LINES)}]aformat=sample_rates=44100:channel_layouts=mono,volume=0.5[m];[m][v2]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=400[md];"
 "[md]volume=0.30[mq];[v1][mq]amix=inputs=2:normalize=0,atrim=0:30,loudnorm=I=-16:TP=-1.5:LRA=7,aformat=channel_layouts=stereo[out]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[out]", "-ar", "44100", "mix.wav"], check=True)
for k, s, _ in LINES:  # print each clip's length so overlaps with the next cue show up
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{k}.mp3"], capture_output=True, text=True).stdout.strip()
    print(k, s, d)
print("wrote", os.path.join(OUT, "mix.wav"))

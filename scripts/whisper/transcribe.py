
import sys
import json
from faster_whisper import WhisperModel

model_size = "base"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

segments, info = model.transcribe("C:\\Users\\chris\\AppData\\Roaming\\mycro\\recordings\\recording_1775836116106.wav", beam_size=5)

text_parts = []
for segment in segments:
    text_parts.append(segment.text.strip())

result = " ".join(text_parts)
print(json.dumps({"text": result, "language": info.language}))

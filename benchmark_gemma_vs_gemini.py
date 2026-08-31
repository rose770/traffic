import json
import time
import requests
from app.config import GEMINI_API_KEY

layers_data = [
    {"name": "0", "color": 7, "entityCount": 45, "sampleTexts": ["TRANSITION ZONE 180 M", "WORK ZONE 60 M", "BUFFER ZONE 20 M"]},
    {"name": "1-ROAD", "color": 7, "entityCount": 8, "sampleTexts": []},
    {"name": "SIGN", "color": 5, "entityCount": 12, "sampleTexts": ["قف", "تمهل - أعمال طريق"]},
    {"name": "0-dim", "color": 7, "entityCount": 6, "sampleTexts": ["180.00", "60.00"]},
    {"name": "تنظيم", "color": 4, "entityCount": 4, "sampleTexts": ["خط التنظيم"]},
    {"name": "CADR-YEL", "color": 2, "entityCount": 14, "sampleTexts": []},
    {"name": "HATCH 90%", "color": 7, "entityCount": 1, "sampleTexts": []}
]

prompt = f"""You are a Senior Traffic CAD GIS Specialist for Madinah Municipality (أمانة منطقة المدينة المنورة).
Analyze these AutoCAD layers from a traffic detour blueprint:
{json.dumps(layers_data, indent=2)}

Generate a clean JSON keymap array for these layers.
Return ONLY valid JSON matching:
{{
  "keymap": [
    {{
      "layerName": "0",
      "titleAr": "المعلومات العامة وتحديد مناطق التحويلة",
      "titleEn": "General Detour Information & Safe Zones",
      "category": "traffic_detour",
      "icon": "🛣️",
      "colorHex": "#FF1744"
    }}
  ]
}}"""


def benchmark():
    api_key = GEMINI_API_KEY
    if not api_key:
        print("No GEMINI_API_KEY set in environment.")
        return

    models = [
        ("Gemma 4 26B", "gemma-4-26b-a4b-it"),
        ("Gemini 2.5 Flash", "gemini-2.5-flash"),
        ("Gemini 2.5 Flash Lite", "gemini-2.5-flash-lite")
    ]

    for label, model_name in models:
        print(f"\n=== Testing {label} ({model_name}) ===")
        start_t = time.time()
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            res = requests.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                },
                timeout=15
            )
            elapsed_ms = int((time.time() - start_t) * 1000)
            print(f"Status: {res.status_code} | Time: {elapsed_ms}ms")
            if res.status_code == 200:
                data = res.json()
                txt = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                print(f"Output:\n{txt[:400]}")
            else:
                print(f"Response: {res.text[:200]}")
        except Exception as ex:
            print(f"Failed: {ex}")


if __name__ == "__main__":
    benchmark()

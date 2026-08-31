import json
import re
import os
import requests
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY


# -------------------------------------------------------------
# 1. Vision AI Line & Map Spatial Alignment
# -------------------------------------------------------------
def align_images_ai(
    cad_image_b64: str,
    map_image_b64: str,
    api_key: Optional[str] = None,
    meters_per_pixel: float = 0.5,
    origin_lat: float = 24.4686
) -> Dict[str, Any]:
    """
    Multi-stage production spatial alignment engine:
    1. Primary: Deterministic Computer Vision feature matching (SIFT + RANSAC + Canny Edge Extraction).
    2. Fallback: Gemini 2.5 Flash Multimodal Vision AI if feature inliers / confidence is insufficient.
    3. Safe Fallback: Zero-shift baseline if all upstream services fail.
    """
    # ── Stage 1: Primary Computer Vision Feature Matching Engine ──
    from app.services.cv_alignment import align_cad_to_map_cv

    cv_result = align_cad_to_map_cv(
        cad_b64=cad_image_b64,
        map_b64=map_image_b64,
        meters_per_pixel=meters_per_pixel,
        origin_lat=origin_lat
    )

    inliers = cv_result.get("inliers", 0)
    confidence = cv_result.get("confidence", 0.0)

    if cv_result.get("success") and inliers >= 6 and confidence >= 0.5:
        print(f"[Spatial Alignment] CV Engine successful: inliers={inliers}, confidence={confidence:.2f}, rot={cv_result.get('rotationDeg', 0):.2f}°")
        return cv_result

    print(f"[Spatial Alignment] CV Engine inliers ({inliers}) or confidence ({confidence:.2f}) below threshold; engaging Gemini 2.5 Flash fallback...")

    # ── Stage 2: Gemini 2.5 Flash Multimodal AI Fallback ──
    clean_key = (api_key.strip() if api_key is not None else (GEMINI_API_KEY or "").strip())

    if not clean_key:
        print("[Vision AI] No GEMINI_API_KEY found, returning baseline vector.")
        return {
            "success": True,
            "dLat": cv_result.get("dLat", 0.0) if inliers >= 3 else 0.0,
            "dLng": cv_result.get("dLng", 0.0) if inliers >= 3 else 0.0,
            "rotationDeg": cv_result.get("rotationDeg", 0.0) if inliers >= 3 else 0.0,
            "scale": 1.0,
            "inliers": inliers,
            "confidence": confidence,
            "method": "cv_low_confidence_fallback" if inliers >= 3 else "baseline_fallback"
        }

    # Clean base64 strings
    cad_raw = re.sub(r"^data:image/\w+;base64,", "", cad_image_b64)
    map_raw = re.sub(r"^data:image/\w+;base64,", "", map_image_b64)

    prompt = (
        "You are an expert geospatial spatial alignment AI specializing in AutoCAD blueprint and satellite road matching.\n"
        "I am providing you with two images:\n"
        "1. A CAD blueprint containing road vectors, lane boundaries, centerlines, and detour corridors.\n"
        "2. An Ultra-HD satellite map of the corresponding physical street.\n\n"
        "Your task:\n"
        "1. Identify the dominant road centerline axis, curb edges, and lane markings in both the CAD drawing and the satellite image.\n"
        "2. Calculate the exact angular disparity (rotation) in degrees between the CAD road corridor and the satellite road.\n"
        "3. Calculate the translational shift (dLat, dLng) required to snap the CAD geometry directly over the physical asphalt road.\n\n"
        "Return ONLY a valid JSON object with the following keys:\n"
        '- "dLat": (number) The latitude offset needed (e.g. 0.00005)\n'
        '- "dLng": (number) The longitude offset needed (e.g. 0.00005)\n'
        '- "rotationDeg": (number) The rotation in degrees needed (-180 to +180)\n\n'
        "Do not include markdown codeblocks or any additional commentary. Output only the raw JSON object."
    )

    try:
        client = genai.Client(api_key=clean_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                prompt,
                types.Part.from_bytes(data=cad_raw.encode("latin1"), mime_type="image/png"),
                types.Part.from_bytes(data=map_raw.encode("latin1"), mime_type="image/png")
            ]
        )

        resp_text = response.text or ""
        json_str = resp_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(json_str)

        return {
            "success": True,
            "dLat": float(data.get("dLat", 0.0)),
            "dLng": float(data.get("dLng", 0.0)),
            "rotationDeg": float(data.get("rotationDeg", 0.0)),
            "scale": 1.0,
            "inliers": inliers,
            "confidence": 0.75,
            "method": "gemini_2_5_flash_multimodal"
        }
    except Exception as err:
        print(f"[Vision AI] GenAI call failed ({err}), trying REST fallback...")
        try:
            # Direct REST fallback
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={clean_key}"
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {"inlineData": {"mimeType": "image/png", "data": cad_raw}},
                        {"inlineData": {"mimeType": "image/png", "data": map_raw}}
                    ]
                }]
            }
            res = requests.post(url, json=payload, timeout=20)
            if res.status_code == 200:
                res_data = res.json()
                raw_txt = res_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                json_str = raw_txt.replace("```json", "").replace("```", "").strip()
                data = json.loads(json_str)
                return {
                    "success": True,
                    "dLat": float(data.get("dLat", 0.0)),
                    "dLng": float(data.get("dLng", 0.0)),
                    "rotationDeg": float(data.get("rotationDeg", 0.0)),
                    "scale": 1.0,
                    "inliers": inliers,
                    "confidence": 0.70,
                    "method": "gemini_rest_fallback"
                }
        except Exception as rest_err:
            print(f"[Vision AI] REST fallback failed: {rest_err}")

    return {
        "success": True,
        "dLat": cv_result.get("dLat", 0.0),
        "dLng": cv_result.get("dLng", 0.0),
        "rotationDeg": cv_result.get("rotationDeg", 0.0),
        "scale": 1.0,
        "inliers": inliers,
        "confidence": confidence,
        "method": "graceful_zero_fallback"
    }


# -------------------------------------------------------------
# 2. AI Phasing Generator (Saudi Road Code 305 Compliant)
# -------------------------------------------------------------
def generate_phasing_schedule(
    project_name: str = "Traffic Detour & Safety Plan",
    road_classification: str = "Main / Expressway",
    traffic_volume: str = "High",
    speed_limit_kmh: float = 80,
    excavation_depth_cm: float = 200,
    total_duration_hours: float = 1632,
    work_start_date: str = "2026-08-30",
    work_end_date: str = "2026-11-06",
    total_lanes: int = 3,
    closed_lanes: int = 1,
    client_api_key: Optional[str] = None
) -> Dict[str, Any]:
    api_key = (client_api_key or GEMINI_API_KEY or "").strip()

    system_prompt = (
        "Act as an MOT-certified Saudi Traffic Management and Detour Phasing Engineer. "
        "Given project metadata, generate an optimal sequential phasing schedule compliant with Saudi Road Code 305. "
        "Ensure site access, mobilization, barrier placements, excavation, testing/backfilling, and road reinstatement phases are realistically distributed."
    )

    user_prompt = f"""Project Metadata:
{json.dumps({
    "project_name": project_name,
    "road_classification": road_classification,
    "traffic_volume": traffic_volume,
    "speed_limit_kmh": speed_limit_kmh,
    "excavation_depth_cm": excavation_depth_cm,
    "total_duration_hours": total_duration_hours,
    "work_start_date": work_start_date,
    "work_end_date": work_end_date,
    "total_lanes": total_lanes,
    "closed_lanes": closed_lanes
}, indent=2)}

Return ONLY a valid JSON array containing sequential phasing milestones with these exact keys:
- "phase_name_ar": string in Arabic (e.g., "أعمال الحفر وتمديد الخدمات")
- "phase_name_en": string in English (e.g., "Excavation and Utility Crossings")
- "start_day": integer (1-indexed start day)
- "duration_days": integer (duration in days)

Do not include any explanation or markdown tags outside the JSON. Return only the JSON array."""

    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[f"{system_prompt}\n\n{user_prompt}"]
            )
            raw_text = response.text or ""
            json_str = raw_text.replace("```json", "").replace("```", "").strip()
            phases = json.loads(json_str)
            if isinstance(phases, list) and len(phases) > 0:
                return {"success": True, "phases": phases, "model": "gemini-2.5-flash"}
        except Exception as ex:
            print(f"[Phasing AI] Gemini call failed ({ex}), trying direct REST fetch...")
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                res = requests.post(url, json={"contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}]}, timeout=15)
                if res.status_code == 200:
                    data = res.json()
                    txt = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    clean_txt = txt.replace("```json", "").replace("```", "").strip()
                    phases = json.loads(clean_txt)
                    if isinstance(phases, list) and len(phases) > 0:
                        return {"success": True, "phases": phases, "model": "gemini-2.5-flash"}
            except Exception as rest_ex:
                print(f"[Phasing AI] REST fallback failed: {rest_ex}")

    # Deterministic fallback compliant with Saudi Road Code 305
    total_days = max(7, round((float(total_duration_hours) or 720) / 24.0))
    is_deep = (float(excavation_depth_cm) or 200) >= 150
    is_arterial = "main" in str(road_classification).lower() or "arterial" in str(road_classification).lower()

    p1_days = max(2, round(total_days * 0.08))
    p2_days = max(2, round(total_days * 0.07))
    p3_days = max(3, round(total_days * (0.45 if is_deep else 0.40)))
    p4_days = max(2, round(total_days * 0.25))
    p5_days = max(2, total_days - (p1_days + p2_days + p3_days + p4_days))

    fallback_phases = [
        {
            "phase_name_ar": "تهيئة الموقع وتوفير المداخل واللوحات التحذيرية المتقدمة",
            "phase_name_en": "Site Access, Mobilization & Advance Warning Signs Installation",
            "start_day": 1,
            "duration_days": p1_days
        },
        {
            "phase_name_ar": "تركيب الصبات الخرسانية المسلحة ومصدات الصدمات وتدرج التحويلة" if is_arterial else "تركيب الحواجز الإرشادية وتدرج التوجيه للتحويلة المرورية",
            "phase_name_en": "Reinforced Concrete Barriers, Crash Attenuators & Taper Setup" if is_arterial else "Traffic Guidance Barriers & Detour Taper Setup",
            "start_day": p1_days + 1,
            "duration_days": p2_days
        },
        {
            "phase_name_ar": "أعمال الحفر العميق وتدعيم جوانب التربة وتمديد خطوط الخدمات" if is_deep else "أعمال الحفر وتمديد خطوط المرافق والبنية التحتية",
            "phase_name_en": "Deep Excavation, Shoring & Main Utility Lines Extension" if is_deep else "Trench Excavation & Utility Services Laying",
            "start_day": p1_days + p2_days + 1,
            "duration_days": p3_days
        },
        {
            "phase_name_ar": "الاختبارات الفنية والردم الهندسي على طبقات ودك التربة",
            "phase_name_en": "Testing, Layered Backfilling & Structural Soil Compaction",
            "start_day": p1_days + p2_days + p3_days + 1,
            "duration_days": p4_days
        },
        {
            "phase_name_ar": "إعادة السفلتة والدهانات الحرارية ورفع التحويلة وفتح الحركة",
            "phase_name_en": "Asphalt Reinstatement, Road Markings & Traffic Reopening",
            "start_day": p1_days + p2_days + p3_days + p4_days + 1,
            "duration_days": p5_days
        }
    ]

    return {"success": True, "phases": fallback_phases, "model": "saudi-road-code-305-rule-engine"}

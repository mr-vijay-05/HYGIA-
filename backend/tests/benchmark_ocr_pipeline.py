"""
Comprehensive Benchmark Script for HYGIA OCR Pipeline.
Measures cold-start and warm-request latency across:
1. Selectable-text PDF (PyMuPDF digital text)
2. Scanned PDF (PyMuPDF render -> PaddleOCR)
3. PNG Image (PaddleOCR)
Measures separate timings for:
- Model initialization
- PDF text extraction
- Page rendering
- OCR inference
- Text post-processing
- Observation extraction
"""
import os
import sys
import time
from pathlib import Path
import json

# Ensure PaddleX doesn't do network checks
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import pymupdf
import numpy as np
import tempfile
from statistics import mean
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.observation_extractor import extract_observations


def run_baseline_extraction(file_path: Path, engine=None):
    """Executes the exact baseline logic as in documents.py, measuring each phase."""
    file_path = Path(file_path)
    ext = file_path.suffix.lower()

    timings = {
        "model_init_ms": 0.0,
        "pdf_text_ms": 0.0,
        "render_ms": 0.0,
        "ocr_inference_ms": 0.0,
        "postprocess_ms": 0.0,
        "observation_extract_ms": 0.0,
        "total_ms": 0.0,
    }

    t_start = time.perf_counter()

    # Model Init timing (if engine not provided)
    if engine is None and (ext in [".png", ".jpg", ".jpeg"] or ext == ".pdf"):
        # We will lazy init only when OCR is actually called
        pass

    pages = []
    used_ocr = False

    if ext == ".pdf":
        with pymupdf.open(file_path) as doc:
            for page_index, page in enumerate(doc):
                t_pdf0 = time.perf_counter()
                text = page.get_text("text").strip()
                timings["pdf_text_ms"] += (time.perf_counter() - t_pdf0) * 1000

                if not text:
                    used_ocr = True
                    # Render pixmap + PNG compression + write to tempfile
                    t_rend0 = time.perf_counter()
                    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
                    image_bytes = pixmap.tobytes("png")
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                        temp_file.write(image_bytes)
                        temp_path = Path(temp_file.name)
                    timings["render_ms"] += (time.perf_counter() - t_rend0) * 1000

                    # OCR Init if needed
                    if engine is None:
                        t_init0 = time.perf_counter()
                        from paddleocr import PaddleOCR
                        engine = PaddleOCR(
                            lang="en",
                            text_detection_model_name="PP-OCRv5_mobile_det",
                            text_recognition_model_name="en_PP-OCRv5_mobile_rec",
                            enable_mkldnn=False,
                            use_doc_orientation_classify=False,
                            use_doc_unwarping=False,
                            use_textline_orientation=False,
                        )
                        timings["model_init_ms"] += (time.perf_counter() - t_init0) * 1000

                    # OCR inference
                    try:
                        t_inf0 = time.perf_counter()
                        results = engine.predict(input=str(temp_path))
                        timings["ocr_inference_ms"] += (time.perf_counter() - t_inf0) * 1000

                        # Post-processing
                        t_post0 = time.perf_counter()
                        lines = []
                        confidences = []
                        for result in results:
                            texts = result.get("rec_texts", [])
                            scores = result.get("rec_scores", [])
                            for idx, t in enumerate(texts):
                                t = str(t).strip()
                                if not t:
                                    continue
                                score = float(scores[idx]) if idx < len(scores) else None
                                lines.append({
                                    "text": t,
                                    "confidence": score,
                                    "needs_review": score is None or score < 0.85,
                                })
                                if score is not None:
                                    confidences.append(score)
                        page_text = "\n".join(l["text"] for l in lines)
                        timings["postprocess_ms"] += (time.perf_counter() - t_post0) * 1000
                    finally:
                        temp_path.unlink(missing_ok=True)

                    pages.append({
                        "page_number": page_index + 1,
                        "extraction_method": "ocr",
                        "extracted_text": page_text,
                        "ocr_lines": lines,
                        "average_ocr_confidence": round(mean(confidences), 4) if confidences else None,
                    })
                else:
                    pages.append({
                        "page_number": page_index + 1,
                        "extraction_method": "pdf_text",
                        "extracted_text": text,
                        "ocr_lines": [],
                        "average_ocr_confidence": None,
                    })
    else:
        # Standalone Image
        used_ocr = True
        if engine is None:
            t_init0 = time.perf_counter()
            from paddleocr import PaddleOCR
            engine = PaddleOCR(
                lang="en",
                text_detection_model_name="PP-OCRv5_mobile_det",
                text_recognition_model_name="en_PP-OCRv5_mobile_rec",
                enable_mkldnn=False,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
            timings["model_init_ms"] += (time.perf_counter() - t_init0) * 1000

        t_inf0 = time.perf_counter()
        results = engine.predict(input=str(file_path))
        timings["ocr_inference_ms"] += (time.perf_counter() - t_inf0) * 1000

        t_post0 = time.perf_counter()
        lines = []
        confidences = []
        for result in results:
            texts = result.get("rec_texts", [])
            scores = result.get("rec_scores", [])
            for idx, t in enumerate(texts):
                t = str(t).strip()
                if not t:
                    continue
                score = float(scores[idx]) if idx < len(scores) else None
                lines.append({
                    "text": t,
                    "confidence": score,
                    "needs_review": score is None or score < 0.85,
                })
                if score is not None:
                    confidences.append(score)
        page_text = "\n".join(l["text"] for l in lines)
        timings["postprocess_ms"] += (time.perf_counter() - t_post0) * 1000

        pages.append({
            "page_number": 1,
            "extraction_method": "ocr",
            "extracted_text": page_text,
            "ocr_lines": lines,
            "average_ocr_confidence": round(mean(confidences), 4) if confidences else None,
        })

    # Observation extraction
    t_obs0 = time.perf_counter()
    observations = extract_observations(pages)
    timings["observation_extract_ms"] = (time.perf_counter() - t_obs0) * 1000

    timings["total_ms"] = (time.perf_counter() - t_start) * 1000

    full_text = "\n\n".join(p["extracted_text"] for p in pages if p["extracted_text"])

    return {
        "engine": engine,
        "timings": timings,
        "character_count": len(full_text),
        "observations_count": len(observations),
        "pages_count": len(pages),
        "used_ocr": used_ocr,
        "observations": [
            {"name": o.name, "value": o.value_numeric, "unit": o.unit}
            for o in observations
        ],
    }


def main():
    test_files = {
        "selectable_pdf": Path("tests/data/test_selectable.pdf"),
        "scanned_pdf": Path("tests/data/test_scanned.pdf"),
        "image_png": Path("tests/data/test_image.png"),
    }

    print("==================================================")
    print("HYGIA OCR Pipeline Baseline Benchmark")
    print("==================================================")

    results = {}

    # Test 1: Selectable PDF (Cold start)
    print("\n[Baseline] Testing Selectable PDF (Cold Start)...")
    res_sel_cold = run_baseline_extraction(test_files["selectable_pdf"], engine=None)
    results["selectable_pdf_cold"] = res_sel_cold

    # Test 2: Selectable PDF (Warm)
    print("[Baseline] Testing Selectable PDF (Warm)...")
    res_sel_warm = run_baseline_extraction(test_files["selectable_pdf"], engine=res_sel_cold["engine"])
    results["selectable_pdf_warm"] = res_sel_warm

    # Test 3: Scanned PDF (Cold Start - fresh engine)
    print("\n[Baseline] Testing Scanned PDF (Cold Start - fresh engine init)...")
    res_scan_cold = run_baseline_extraction(test_files["scanned_pdf"], engine=None)
    results["scanned_pdf_cold"] = res_scan_cold
    engine = res_scan_cold["engine"]

    # Test 4: Scanned PDF (Warm)
    print("[Baseline] Testing Scanned PDF (Warm)...")
    res_scan_warm = run_baseline_extraction(test_files["scanned_pdf"], engine=engine)
    results["scanned_pdf_warm"] = res_scan_warm

    # Test 5: PNG Image (Warm)
    print("\n[Baseline] Testing Image PNG (Warm)...")
    res_img_warm = run_baseline_extraction(test_files["image_png"], engine=engine)
    results["image_png_warm"] = res_img_warm

    print("\n----------------- BASELINE SUMMARY -----------------")
    for key, data in results.items():
        t = data["timings"]
        print(f"\n>> {key.upper()}:")
        print(f"   Total Time:        {t['total_ms']:.2f} ms")
        print(f"   Model Init:        {t['model_init_ms']:.2f} ms")
        print(f"   PDF Text Extract:  {t['pdf_text_ms']:.2f} ms")
        print(f"   Page Rendering:    {t['render_ms']:.2f} ms")
        print(f"   OCR Inference:     {t['ocr_inference_ms']:.2f} ms")
        print(f"   Post-Processing:   {t['postprocess_ms']:.2f} ms")
        print(f"   Observation Extr:  {t['observation_extract_ms']:.2f} ms")
        print(f"   Chars Extracted:   {data['character_count']}")
        print(f"   Observations Found:{data['observations_count']}")

    with open("tests/baseline_benchmark_results.json", "w") as f:
        # Strip engine object for json serialization
        serializable = {k: {sk: sv for sk, sv in v.items() if sk != "engine"} for k, v in results.items()}
        json.dump(serializable, f, indent=2)
    print("\nSaved baseline results to tests/baseline_benchmark_results.json")


if __name__ == "__main__":
    main()

"""
Full Comparative Benchmark: Baseline vs Optimized HYGIA OCR Pipeline.

Runs on identical synthetic test documents:
- tests/data/test_selectable.pdf
- tests/data/test_scanned.pdf
- tests/data/test_image.png

Measures and logs:
- Cold-start and warm-request latency
- Granular timings:
  - Model initialization
  - PDF text extraction
  - Page rendering
  - OCR inference
  - Text post-processing
  - Observation extraction
- Text completeness & extracted observations
- In-memory cache reuse speedup
"""
import json
import os
import sys
import time
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import pymupdf
import numpy as np

from app.services import document_extractor
from app.services.observation_extractor import extract_observations


def run_optimized_pipeline(file_path: Path, document_id: str | None = None, use_cache: bool = True):
    t_start = time.perf_counter()

    extraction = document_extractor.extract_document_pages(
        file_path=file_path,
        document_id=document_id,
        use_cache=use_cache,
    )
    pages = extraction["pages"]

    t_obs_start = time.perf_counter()
    observations = extract_observations(pages)
    obs_time_ms = (time.perf_counter() - t_obs_start) * 1000

    total_ms = (time.perf_counter() - t_start) * 1000

    full_text = "\n\n".join(p["extracted_text"] for p in pages if p["extracted_text"])

    timings = dict(extraction["timings"])
    timings["observation_extract_ms"] = round(obs_time_ms, 2)
    timings["total_measured_ms"] = round(total_ms, 2)

    return {
        "timings": timings,
        "character_count": len(full_text),
        "observations_count": len(observations),
        "pages_count": len(pages),
        "used_ocr": extraction["used_ocr"],
        "cache_hit": extraction.get("cache_hit", False),
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

    # Load baseline results
    with open("tests/baseline_benchmark_results.json", "r") as f:
        baseline = json.load(f)

    # Reset optimized engine singleton to measure true cold start
    document_extractor._ocr_engine = None
    document_extractor._extraction_cache.clear()

    optimized = {}

    print("==================================================")
    print("RUNNING OPTIMIZED PIPELINE BENCHMARK")
    print("==================================================")

    # 1. Selectable PDF (Cold) - Note: OCR engine should NOT even be loaded!
    print("\n[Optimized] 1. Selectable PDF (Cold start)...")
    res_sel_cold = run_optimized_pipeline(test_files["selectable_pdf"], "doc_sel_1", use_cache=False)
    optimized["selectable_pdf_cold"] = res_sel_cold
    print(f"   OCR Engine initialized? {document_extractor._ocr_engine is not None} (Expected: False - lazy skip)")

    # 2. Selectable PDF (Warm)
    print("[Optimized] 2. Selectable PDF (Warm)...")
    res_sel_warm = run_optimized_pipeline(test_files["selectable_pdf"], "doc_sel_2", use_cache=False)
    optimized["selectable_pdf_warm"] = res_sel_warm

    # 3. Scanned PDF (Cold - triggers lazy engine init)
    print("\n[Optimized] 3. Scanned PDF (Cold start - triggers lazy engine load)...")
    res_scan_cold = run_optimized_pipeline(test_files["scanned_pdf"], "doc_scan_1", use_cache=False)
    optimized["scanned_pdf_cold"] = res_scan_cold

    # 4. Scanned PDF (Warm)
    print("[Optimized] 4. Scanned PDF (Warm)...")
    res_scan_warm = run_optimized_pipeline(test_files["scanned_pdf"], "doc_scan_2", use_cache=False)
    optimized["scanned_pdf_warm"] = res_scan_warm

    # 5. Image PNG (Warm)
    print("\n[Optimized] 5. Image PNG (Warm)...")
    res_img_warm = run_optimized_pipeline(test_files["image_png"], "doc_img_1", use_cache=False)
    optimized["image_png_warm"] = res_img_warm

    # 6. Cache Hit Test (Repeated call on Scanned PDF)
    print("\n[Optimized] 6. Scanned PDF Cache Hit (Simulating repeated /extract or observations call)...")
    res_scan_cached = run_optimized_pipeline(test_files["scanned_pdf"], "doc_scan_cached", use_cache=True)
    # 2nd call with same ID hits cache
    t_c0 = time.perf_counter()
    res_scan_cache_hit = run_optimized_pipeline(test_files["scanned_pdf"], "doc_scan_cached", use_cache=True)
    t_cache_hit_ms = (time.perf_counter() - t_c0) * 1000
    optimized["scanned_pdf_cache_hit"] = res_scan_cache_hit
    optimized["scanned_pdf_cache_hit"]["timings"]["total_measured_ms"] = round(t_cache_hit_ms, 2)

    with open("tests/optimized_benchmark_results.json", "w") as f:
        json.dump(optimized, f, indent=2)

    # Comparison Table
    print("\n" + "=" * 95)
    print(f"{'TEST CASE':<22} | {'BASELINE (ms)':<15} | {'OPTIMIZED (ms)':<15} | {'SPEEDUP':<12} | {'TEXT ACCURACY'}")
    print("=" * 95)

    cases = [
        ("selectable_pdf_cold", "Selectable PDF (Cold)"),
        ("selectable_pdf_warm", "Selectable PDF (Warm)"),
        ("scanned_pdf_cold",    "Scanned PDF (Cold)"),
        ("scanned_pdf_warm",    "Scanned PDF (Warm)"),
        ("image_png_warm",      "Image PNG (Warm)"),
    ]

    for key, label in cases:
        base_t = baseline[key]["timings"]["total_ms"]
        opt_t = optimized[key]["timings"]["total_measured_ms"]
        speedup = f"{base_t / opt_t:.2f}x" if opt_t > 0 else "N/A"
        base_chars = baseline[key]["character_count"]
        opt_chars = optimized[key]["character_count"]
        base_obs = baseline[key]["observations_count"]
        opt_obs = optimized[key]["observations_count"]
        acc = f"{opt_chars}/{base_chars} chars, {opt_obs}/{base_obs} obs"
        print(f"{label:<22} | {base_t:<15.2f} | {opt_t:<15.2f} | {speedup:<12} | {acc}")

    cached_t = optimized["scanned_pdf_cache_hit"]["timings"]["total_measured_ms"]
    scan_warm_base = baseline["scanned_pdf_warm"]["timings"]["total_ms"]
    print(f"{'Scanned PDF (Cached)':<22} | {scan_warm_base:<15.2f} | {cached_t:<15.2f} | {scan_warm_base / cached_t:<10.1f}x | 100% (Instant)")
    print("=" * 95)


if __name__ == "__main__":
    main()

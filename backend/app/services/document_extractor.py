"""
Document Extraction and OCR Service for HYGIA.

Provides optimized, lazy-initialized text extraction from PDFs and images:
- Hybrid PDF extraction: fast PyMuPDF digital text extraction first;
  falls back to PaddleOCR only when page text is absent or insufficient.
- Lazy thread-safe singleton OCR engine reuse (never reloaded per request).
- Intel oneDNN (MKL-DNN) CPU inference optimization for PP-OCRv5 mobile models.
- Direct in-memory numpy array rendering from PyMuPDF pixmaps (no disk I/O,
  no temporary PNG files).
- Dimension-aware dynamic rendering scale to avoid excessive memory/CPU usage.
- Granular stage timing and logging (model init, pdf text, render, ocr, post-process, obs).
- In-memory extraction cache keyed by document ID and file state to prevent duplicate processing.
"""
from __future__ import annotations

import logging
import os
import re
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from statistics import mean
from typing import Any

import numpy as np
import pymupdf

# Suppress unnecessary remote check logs from PaddleX
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

logger = logging.getLogger(__name__)

# Lock for thread-safe OCR engine singleton initialization
_ocr_lock = threading.Lock()
_ocr_engine = None

# In-memory LRU cache for extraction results (max 100 recent documents)
_CACHE_MAX_ENTRIES = 100
_extraction_cache: OrderedDict[str, dict[str, Any]] = OrderedDict()
_cache_lock = threading.Lock()


def get_ocr_engine():
    """Lazily initialize and return the shared PaddleOCR singleton.

    Uses PP-OCRv5 mobile models with enable_mkldnn=True for optimized CPU inference.
    Extra document pipelines (orientation, unwarping) are disabled to minimize latency.
    """
    global _ocr_engine
    if _ocr_engine is None:
        with _ocr_lock:
            if _ocr_engine is None:
                logger.info("Initializing PaddleOCR engine singleton (lazy cold start)...")
                from paddleocr import PaddleOCR

                _ocr_engine = PaddleOCR(
                    lang="en",
                    text_detection_model_name="PP-OCRv5_mobile_det",
                    text_recognition_model_name="en_PP-OCRv5_mobile_rec",
                    enable_mkldnn=True,
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                )
                logger.info("PaddleOCR engine singleton initialized successfully.")
    return _ocr_engine


def is_sufficient_text(text: str) -> bool:
    """Determine if extracted digital text is sufficient to skip OCR.

    Requires at least 30 alphanumeric characters or 5 word tokens.
    Protects against scanned documents that contain only stray watermark characters.
    """
    if not text:
        return False
    alnum_count = sum(1 for c in text if c.isalnum())
    words = re.findall(r"\w+", text)
    return alnum_count >= 30 or len(words) >= 5


def calculate_render_scale(
    page: pymupdf.Page,
    base_scale: float = 1.5,
    max_dimension: int = 1800,
) -> float:
    """Calculate rendering matrix scale without exceeding memory/dimension limits.

    For standard A4 pages (~595x842 pt), 1.5x (~893x1263 px) gives optimal readability
    for medical biomarkers while maintaining fast rendering.
    """
    rect = page.rect
    longest_side = max(rect.width, rect.height)
    if longest_side <= 0:
        return base_scale
    if longest_side * base_scale > max_dimension:
        return max_dimension / longest_side
    return base_scale


def recognize_image_data(image_input: np.ndarray | str | Path) -> tuple[dict[str, Any], float, float]:
    """Run OCR on a numpy image array or file path.

    Returns:
        (result_dict, ocr_inference_ms, postprocess_ms)
    """
    engine = get_ocr_engine()

    t_inf_start = time.perf_counter()
    if isinstance(image_input, Path):
        image_input = str(image_input)
    results = engine.predict(input=image_input)
    ocr_inference_ms = (time.perf_counter() - t_inf_start) * 1000

    t_post_start = time.perf_counter()
    lines = []
    confidences = []

    for result in results:
        texts = result.get("rec_texts", [])
        scores = result.get("rec_scores", [])
        for index, text in enumerate(texts):
            text = str(text).strip()
            if not text:
                continue
            score = float(scores[index]) if index < len(scores) else None
            lines.append({
                "text": text,
                "confidence": score,
                "needs_review": score is None or score < 0.85,
            })
            if score is not None:
                confidences.append(score)

    postprocess_ms = (time.perf_counter() - t_post_start) * 1000

    return (
        {
            "lines": lines,
            "text": "\n".join(line["text"] for line in lines),
            "average_confidence": round(mean(confidences), 4) if confidences else None,
        },
        ocr_inference_ms,
        postprocess_ms,
    )


def get_cache_key(file_path: Path, document_id: str | None = None) -> str:
    """Compute cache key based on document_id and file modification signature."""
    try:
        stat = file_path.stat()
        mtime = stat.st_mtime
        size = stat.st_size
    except OSError:
        mtime = 0
        size = 0
    doc_prefix = document_id or str(file_path)
    return f"{doc_prefix}:{size}:{mtime}"


def get_cached_extraction(cache_key: str) -> dict[str, Any] | None:
    """Retrieve extraction result from LRU memory cache if present."""
    with _cache_lock:
        if cache_key in _extraction_cache:
            _extraction_cache.move_to_end(cache_key)
            return _extraction_cache[cache_key]
    return None


def store_cached_extraction(cache_key: str, data: dict[str, Any]) -> None:
    """Store extraction result in LRU memory cache."""
    with _cache_lock:
        _extraction_cache[cache_key] = data
        _extraction_cache.move_to_end(cache_key)
        if len(_extraction_cache) > _CACHE_MAX_ENTRIES:
            _extraction_cache.popitem(last=False)


def extract_document_pages(
    file_path: Path,
    document_id: str | None = None,
    use_cache: bool = True,
) -> dict[str, Any]:
    """Extract text from a PDF or image file with hybrid PyMuPDF/PaddleOCR.

    Measures and returns separate timings:
    - model_init_ms
    - pdf_text_ms
    - render_ms
    - ocr_inference_ms
    - postprocess_ms
    - total_ms
    """
    file_path = Path(file_path)
    cache_key = get_cache_key(file_path, document_id)

    if use_cache:
        cached = get_cached_extraction(cache_key)
        if cached is not None:
            logger.info("Reusing cached extraction for document %s", document_id or file_path.name)
            # Return copy of cached result with cache_hit flag
            cached_copy = dict(cached)
            cached_copy["cache_hit"] = True
            return cached_copy

    timings = {
        "model_init_ms": 0.0,
        "pdf_text_ms": 0.0,
        "render_ms": 0.0,
        "ocr_inference_ms": 0.0,
        "postprocess_ms": 0.0,
        "total_ms": 0.0,
    }

    t_total_start = time.perf_counter()
    extension = file_path.suffix.lower()
    pages = []
    used_ocr = False

    if extension == ".pdf":
        with pymupdf.open(file_path) as pdf:
            page_count = pdf.page_count
            for page_index in range(page_count):
                page = pdf[page_index]
                # 1. Digital text extraction first
                t_pdf_start = time.perf_counter()
                digital_text = str(page.get_text("text")).strip()
                timings["pdf_text_ms"] += (time.perf_counter() - t_pdf_start) * 1000

                # 2. Check if digital text is sufficient
                if is_sufficient_text(digital_text):
                    pages.append({
                        "page_number": page_index + 1,
                        "extraction_method": "pdf_text",
                        "extracted_text": digital_text,
                        "ocr_lines": [],
                        "average_ocr_confidence": None,
                    })
                else:
                    # 3. Fallback to OCR for scanned or empty page
                    used_ocr = True

                    # Model init timing (lazy cold start tracking)
                    if _ocr_engine is None:
                        t_init_start = time.perf_counter()
                        get_ocr_engine()
                        timings["model_init_ms"] += (time.perf_counter() - t_init_start) * 1000

                    # Render page directly to numpy array in memory (no disk I/O)
                    t_rend_start = time.perf_counter()
                    scale = calculate_render_scale(page)
                    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                    img_array = np.frombuffer(
                        pixmap.samples,
                        dtype=np.uint8,
                    ).reshape(pixmap.height, pixmap.width, pixmap.n)
                    if pixmap.n == 4:
                        img_array = img_array[:, :, :3]
                    timings["render_ms"] += (time.perf_counter() - t_rend_start) * 1000

                    # Run OCR inference & postprocessing
                    ocr_res, inf_ms, post_ms = recognize_image_data(img_array)
                    timings["ocr_inference_ms"] += inf_ms
                    timings["postprocess_ms"] += post_ms

                    pages.append({
                        "page_number": page_index + 1,
                        "extraction_method": "ocr",
                        "extracted_text": ocr_res["text"],
                        "ocr_lines": ocr_res["lines"],
                        "average_ocr_confidence": ocr_res["average_confidence"],
                    })
    else:
        # Standalone Image (.png, .jpg, .jpeg)
        used_ocr = True
        page_count = 1

        if _ocr_engine is None:
            t_init_start = time.perf_counter()
            get_ocr_engine()
            timings["model_init_ms"] += (time.perf_counter() - t_init_start) * 1000

        ocr_res, inf_ms, post_ms = recognize_image_data(str(file_path))
        timings["ocr_inference_ms"] += inf_ms
        timings["postprocess_ms"] += post_ms

        pages.append({
            "page_number": 1,
            "extraction_method": "ocr",
            "extracted_text": ocr_res["text"],
            "ocr_lines": ocr_res["lines"],
            "average_ocr_confidence": ocr_res["average_confidence"],
        })

    timings["total_ms"] = (time.perf_counter() - t_total_start) * 1000

    # Round timing figures to 2 decimal places
    rounded_timings = {k: round(v, 2) for k, v in timings.items()}

    logger.info(
        "Extracted %d pages for document %s (used_ocr=%s). Timings: %s",
        page_count,
        document_id or file_path.name,
        used_ocr,
        rounded_timings,
    )

    result = {
        "page_count": page_count,
        "pages": pages,
        "used_ocr": used_ocr,
        "timings": rounded_timings,
        "cache_hit": False,
    }

    if use_cache:
        store_cached_extraction(cache_key, result)

    return result

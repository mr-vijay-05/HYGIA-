# HYGIA — Medical Intelligence Pipeline Integration Audit

**Audit Date:** October 13, 2026  
**Auditor:** Senior Medical Document Intelligence & FastAPI Engineer  
**Scope:** Backend (`D:\HYGIA-\backend`), Frontend (`D:\HYGIA-\frontend`), OCR Engine, Observation Extraction Pipeline, Database Models, and UI Integration.  
**Audit File:** `D:\HYGIA-\docs\MEDICAL_PIPELINE_AUDIT.md`  

---

## Executive Summary

This audit assesses the technical maturity and end-to-end integration of the HYGIA medical document intelligence pipeline. The current pipeline successfully ingests multi-format documents (PDF, PNG, JPG), implements an optimized hybrid digital text probe (PyMuPDF) with fallback to an Intel oneDNN-accelerated PaddleOCR engine, and persists raw candidate observations into an SQLite database. 

However, the downstream intelligence layer—specifically tabular layout reconstruction, clinical abbreviation matching, multiline extraction, reference range capture, abnormal flagging, human review transitions, and dynamic Recent Health Activity UI synchronization—remains either partially implemented or missing. The primary root cause for documents displaying **"No structured lab parameters found"** is a rigid, single-line regex parser in `observation_extractor.py` that recognizes only 13 exact lowercase strings, ignores common clinical abbreviations (e.g., `Hb`, `FBS`, `PPBS`, `HbA1c`, `BUN`), discards multiline OCR text blocks, and fails on tabular or inverted column layouts.

---

## End-to-End Pipeline Execution Trace

```
[User Upload via Frontend Dropzone / Camera Scan]
  │
  ▼
1. POST /api/v1/documents/upload (FastAPI, app/api/documents.py:63)
   - Validates file type (.pdf, .png, .jpg) & magic bytes
   - Persists raw file to backend/uploads/{uuid}{ext}
   - Inserts MedicalDocument row (processing_status="uploaded")
   - Returns DocumentResponse { id, filename, patient_id, processing_status: "uploaded" }
  │
  ▼
2. GET /api/v1/documents/{document_id}/extract (app/api/documents.py:158)
   - Checks in-memory LRU ExtractionCache (app/services/document_extractor.py:126)
   - PyMuPDF Probe: Reads digital text per page (page.get_text("text"))
     ├─ If is_sufficient_text(text) (>=30 alnum chars or >=5 words):
     │  └─ Uses "pdf_text" extraction. Skips OCR entirely (~2 ms).
     └─ If scanned / insufficient text:
        └─ Fallback to PaddleOCR (PP-OCRv5 mobile models via oneDNN CPU).
           Renders page directly to in-memory NumPy array (~720 ms).
   - Generates page-level ocr_lines, confidence scores, and timing metrics.
   - Stores extraction results in memory cache.
   - Returns JSON { document_id, filename, page_count, character_count, extracted_text, pages, used_ocr, timings }
  │
  ▼
3. POST /api/v1/documents/{document_id}/observations/extract (app/api/documents.py:245)
   - Reuses pages from in-memory ExtractionCache (0 ms re-read).
   - Invokes extract_observations(pages) (app/services/observation_extractor.py:41).
   - Iterates line-by-line using conservative regex against 13 hardcoded test names.
   - Computes duplicates against existing DB keys (name, value_text, page, evidence_text).
   - Persists new candidate Observation rows (review_status="pending").
   - Updates MedicalDocument.processing_status = "processed".
   - Returns JSON { document_id, candidates_found, observations_saved, duplicates_skipped, review_status: "pending", observations: [...] }
  │
  ▼
4. Frontend Client Notification & Recent Health Activity Render (frontend/script.js:840)
   - Client receives JSON response.
   - Calls prependTimelineItem() to insert a temporary row at the top of #timelineList.
   - Current limitation: The underlying HTML in #timelineList is hardcoded to 2018 demo rows;
     on page reload, uploaded activities disappear because there is no API call to fetch existing documents.
```

---

## Component-by-Component Audit

### 1. PDF Text Extraction

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **IMPLEMENTED** |
| **Evidence** | `backend/app/services/document_extractor.py` (`extract_document_pages`, lines 145–225), `backend/requirements.txt` (`pymupdf==1.28.2`), `backend/tests/test_ocr_pipeline.py` (`test_ocr_pipeline_selectable_pdf`) |
| **What Works Today** | PyMuPDF 1.28.2 is installed and actively invoked. `extract_document_pages()` evaluates each page independently. Pages with selectable digital text meeting `is_sufficient_text()` (>=30 alphanumeric characters or >=5 word tokens) are extracted directly via `page.get_text("text")` in ~2 ms without loading or invoking PaddleOCR. Pages with insufficient text or pure raster images fall back to OCR page-by-page. |
| **What is Incomplete / Incorrect** | Multi-column PDF layout reading order is not explicitly reconstructed; text is extracted via MuPDF's default physical layout reading order. Complex nested tables may have split table cells. |
| **Dependencies / Config** | `pymupdf==1.28.2` (installed and functional). |
| **Recommended Action** | Maintain current hybrid logic. Optionally integrate MuPDF layout blocks (`page.get_text("blocks")`) to group bounding-box text blocks if column-interleaving issues arise. |
| **Verified Test Results** | `tests/test_ocr_pipeline.py::test_ocr_pipeline_selectable_pdf` PASSED in 0.08s. PyMuPDF extracted 719 characters from `test_selectable.pdf` with `used_ocr=False`. |

---

### 2. OCR Engine

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **IMPLEMENTED** (PaddleOCR) / **MISSING** (RapidOCR & Tesseract) |
| **Evidence** | `backend/app/services/document_extractor.py` (`get_ocr_engine`, `recognize_image_data`, lines 43–120), environment pip list (`paddleocr==3.5.0`, `paddlepaddle==3.2.2`, `paddlex==3.5.2`) |
| **What Works Today** | PaddleOCR 3.5.0 is configured with official mobile models (`PP-OCRv5_mobile_det` and `en_PP-OCRv5_mobile_rec`). Engine initialization is lazy and thread-safe via `_ocr_lock = threading.Lock()`; the singleton instance is loaded once into memory on first OCR demand and reused across all subsequent requests without reloads. CPU inference is accelerated via Intel oneDNN (`enable_mkldnn=True`), reducing inference time to ~720 ms per page. Page-level confidence is calculated and tracked. |
| **What is Incomplete / Incorrect** | **RapidOCR** and **Tesseract** are completely absent: `rapidocr_onnxruntime` and `pytesseract` are not installed in the virtual environment and have zero code references. No alternative fallback OCR engine exists if PaddlePaddle encounters an unsupported image format. |
| **Dependencies / Config** | Local PaddleOCR models cached at `C:\Users\VIJAY VIGNESH P\.paddlex\official_models\`. Network hoster checks disabled via `PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True`. |
| **Recommended Action** | PaddleOCR is fast and accurate on CPU. If lighter startup footprint or ONNX execution is desired in the future, evaluate `rapidocr_onnxruntime`. For now, retain PaddleOCR. |
| **Verified Test Results** | `tests/test_ocr_pipeline.py::test_ocr_pipeline_scanned_pdf_fallback` and `test_ocr_pipeline_png_image` both PASSED. OCR inference executed in 737 ms on CPU. |

---

### 3. Layout Reconstruction

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **MISSING** |
| **Evidence** | `backend/app/services/document_extractor.py` (`recognize_image_data`, lines 84–120), `backend/app/services/observation_extractor.py` |
| **What Works Today** | PaddleOCR detects text lines and returns text boxes (`rec_texts` and `rec_scores`). Lines are joined using newlines (`"\n".join(...)`). |
| **What is Incomplete / Incorrect** | PaddleOCR detection polygons/bounding boxes (`dt_polys`) are **completely discarded** by `recognize_image_data()`. Neither 2D spatial coordinates, XY-cut reading order, nor row-column alignment algorithms are implemented. When lab reports present results in tabular columns (e.g., Column 1: Test Name, Column 2: Result, Column 3: Unit, Column 4: Reference Interval), OCR text boxes can be returned out of order or test names and values are separated into disjoint line sequences. Without 2D spatial clustering or column bounding-box association, table row integrity is lost. |
| **Dependencies / Config** | NumPy is available; OpenCV (`opencv-contrib-python==4.10.0.84`) is installed. Bounding-box parsing requires retrieving `dt_polys` from PaddleOCR inference results. |
| **Recommended Action** | Preserve `dt_polys` alongside `rec_texts`. Implement a lightweight 1D/2D spatial clustering utility that groups text boxes sharing similar vertical (Y-axis) bands into coherent table rows before passing text to the extractor. |
| **Verified Test Results** | Verified by code inspection: `recognize_image_data()` line 94 only queries `result.get("rec_texts", [])` and `result.get("rec_scores", [])`, discarding all box geometry. |

---

### 4. Rule-Based Extraction

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **PARTIALLY IMPLEMENTED** |
| **Evidence** | `backend/app/services/observation_extractor.py` (`TEST_NAMES`, `extract_observations`, lines 19–134) |
| **What Works Today** | Deterministic regex parsing using `re.search` extracts candidate observations from text lines containing one of 13 hardcoded lab test names. Captures `value_text`, converts comma/period decimals to float `value_numeric`, extracts units if matching standard unit tokens, and stores `page_number` and `evidence_text`. |
| **What is Incomplete / Incorrect** | **Major structural gaps:**<br>1. **Lexicon too small:** Only 13 exact lowercase strings are recognized. Common abbreviations (`Hb`, `Hgb`, `FBS`, `PPBS`, `RBS`, `HbA1c`, `Urea`, `BUN`, `Uric Acid`, `Bilirubin`, `SGOT`/`AST`, `SGPT`/`ALT`, `ESR`, `PLT`, `TLC`) are completely absent.<br>2. **Single-line limitation:** Processes text strictly via `text.splitlines()`. If OCR outputs the test name on one line and the result on the next, extraction fails.<br>3. **One-way search:** Only extracts values *after* the test name (`evidence[name_match.end():]`). Inverted layouts (value before test name) yield zero matches.<br>4. **Reference ranges discarded:** Line 108 explicitly sets `reference_range = None` with a comment stating reference ranges are not inferred.<br>5. **No abnormal flag parsing:** Flags such as `H`, `HIGH`, `L`, `LOW`, `*`, `CRITICAL` are ignored.<br>6. **Number confusion:** Grabs the first number following the test name; if a reference interval appears before the result (e.g. `Hemoglobin (12-16) 14.5`), it mistakenly selects `12` as the result. |
| **Dependencies / Config** | Python standard library `re`. No external dependencies required. |
| **Recommended Action** | Expand clinical test dictionary to include medical synonyms and abbreviations. Implement multi-line windowing, reference-range pattern pre-filtering (so range numbers are not mistaken for results), bidirectional value searching, and flag capture. |
| **Verified Test Results** | Verified against `tests/data/test_selectable.pdf` (9 observations extracted). Fails on standard abbreviated reports containing `Hb: 14.2` or `FBS: 95`. |

---

### 5. Medical NER (Named Entity Recognition)

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **MISSING** |
| **Evidence** | Pip package list audit (`scispacy`, `spacy`, `medcat` are not installed), `backend/app/` codebase search (zero imports or calls) |
| **What Works Today** | None. No biomedical NER models are deployed or integrated. |
| **What is Incomplete / Incorrect** | scispaCy, MedCAT, or similar clinical NER engines are not installed. Medical terminology is not normalized against clinical ontologies (LOINC, SNOMED-CT, UMLS, RxNorm). Negation detection (e.g., distinguishing "no evidence of diabetes" from "diabetes diagnosed", or "negative for microalbuminuria") is completely absent. |
| **Dependencies / Config** | Would require `spacy`, `scispacy`, and clinical language models (e.g., `en_core_sci_sm` or `en_ner_bc5cdr_md`). These models require substantial disk space (100MB–1GB) and CPU/RAM overhead. |
| **Recommended Action** | Do not block current lab extraction on heavy NER dependencies. Rule-based regex with normalized synonym mapping covers standard structured lab tests with near-zero latency. Schedule scispaCy/NegEx for unstructured discharge summaries in Phase 3. |
| **Verified Test Results** | Verified via environment inspection: `scispacy` and `medcat` import checks raised `ModuleNotFoundError`. |

---

### 6. LLM-Based Extraction

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **MISSING** |
| **Evidence** | `backend/app/core/config.py` (no LLM keys or providers), pip package list (no `openai`, `anthropic`, `google-generativeai`, `langchain`, or `ollama` packages), codebase search |
| **What Works Today** | None. All processing in the pipeline is strictly local deterministic code. |
| **What is Incomplete / Incorrect** | No LLM provider is configured. There is no structured JSON prompt schema, no Pydantic schema validation for LLM outputs, no hallucination guardrail, and no remote or local LLM fallback handler. |
| **Dependencies / Config** | Requires LLM API credentials or local model runner (e.g., Ollama / vLLM), plus prompt templates and structured output parsers. |
| **Recommended Action** | Treat LLM extraction as an optional future enhancement for ambiguous, unstructured clinical narratives. The core lab report extraction pipeline must function robustly, privately, and offline without external LLM dependencies. |
| **Verified Test Results** | Verified via codebase audit: zero LLM dependencies or API calls exist in `backend/app/`. |

---

### 7. Validation and Evidence

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **PARTIALLY IMPLEMENTED** |
| **Evidence** | `backend/app/services/observation_extractor.py` (`ExtractedObservation` dataclass), `backend/app/models/observation.py` (`Observation` SQLAlchemy model), `backend/app/schemas/` |
| **What Works Today** | Extracted observations preserve source trace evidence: `page_number` and exact `evidence_text` (the source line) are captured and saved to the database. Extracted numeric values are safely parsed to float (`value_numeric`), and string representations are preserved (`value_text`). |
| **What is Incomplete / Incorrect** | 1. **No Pydantic Schema:** `ExtractedObservation` is a standard Python `@dataclass`. There is no Pydantic `ObservationCreate` or `ObservationResponse` schema in `app/schemas/`.<br>2. **Units & Ranges:** Units are only captured if matching a small set of tokens; reference ranges are hardcoded to `None`.<br>3. **Abnormal Flags:** Clinical abnormal flags (`H`/`L`, `High`/`Low`) are not captured.<br>4. **Confidence:** Confidence scores are computed at the OCR line level but are not mapped or propagated to individual observations. |
| **Dependencies / Config** | `pydantic==2.14.1` is installed and available in the project. |
| **Recommended Action** | Create formal Pydantic schemas (`ObservationCandidate`, `ObservationResponse`) in `app/schemas/observation.py`. Add `flag` capture and store it in `Observation.code` or designated schema attribute. |
| **Verified Test Results** | Database models persist `page_number` and `evidence_text` successfully in existing tests. |

---

### 8. Data Storage and Review

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **PARTIALLY IMPLEMENTED** |
| **Evidence** | `backend/app/models/observation.py`, `backend/app/models/medical_document.py`, `backend/app/api/documents.py` (`extract_and_save_observations`, lines 245–385) |
| **What Works Today** | Extracted observations are persisted to SQLite in the `observations` table. All candidate observations are assigned `review_status="pending"` in strict compliance with the database check constraint (`ck_observation_review_status IN ('pending', 'reviewed', 'corrected')`). Repeated extractions check `existing_keys = {(item.name.lower(), item.value_text, item.page_number, item.evidence_text) ...}` to prevent duplicate rows. Once processed, `MedicalDocument.processing_status` is updated to `"processed"`. |
| **What is Incomplete / Incorrect** | **Missing Review API Endpoints:** There is **no API endpoint** implemented to allow a clinician or patient to review, approve, correct, or reject an observation. The table schema supports `'reviewed'` and `'corrected'`, but no `PATCH /api/v1/observations/{id}` or `POST /api/v1/documents/{doc_id}/observations/{id}/review` route exists. Review decisions cannot currently be updated through the backend. |
| **Dependencies / Config** | SQLAlchemy 2.1.4, SQLite (`hygia.db`). |
| **Recommended Action** | Implement `PATCH /api/v1/observations/{observation_id}` (or `POST /observations/{id}/review`) to allow authenticated users to update `review_status` to `'reviewed'` or `'corrected'` and record corrections. |
| **Verified Test Results** | `tests/test_ocr_pipeline.py` verified that repeated calls skip duplicate observations and keep `review_status="pending"`. |

---

### 9. API and Frontend Integration

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **PARTIALLY IMPLEMENTED** |
| **Evidence** | `backend/app/api/documents.py`, `frontend/script.js` (lines 474–545, 760–870), `frontend/index.html` (lines 324–430) |
| **What Works Today** | File upload (`POST /documents/upload`), text extraction (`GET /documents/{id}/extract`), and observation extraction (`POST /documents/{id}/observations/extract`) are chained in `frontend/script.js`. Upon successful upload, `prependTimelineItem()` inserts a card at the top of `#timelineList` displaying the extracted candidate observation summary. |
| **What is Incomplete / Incorrect** | 1. **Demo Data on Reload:** `#timelineList` in `index.html` contains hardcoded static HTML from June 2018 (`Doctor Visit`, `Treatment`). When the user refreshes the page, uploaded documents disappear from the UI because the frontend never fetches existing documents on page load.<br>2. **Missing Document Listing API:** The backend has no `GET /api/v1/documents?patient_id={id}` endpoint to query stored documents for an active patient.<br>3. **Missing Data-Driven States:** The 4 required states (**Text extracted — Review required**, **Observations found — Pending review**, **Text extracted — No observations detected**, **Extraction failed — Retry available**) are not rendered systematically.<br>4. **Layout Squishing / Overflow:** `.timeline-item-body` in `style.css` is styled with horizontal flex layout, causing long document IDs, filenames, and observation chips to compress horizontally and overflow containers.<br>5. **No Action Buttons:** The cards lack interactive buttons (**View extracted text**, **Review observations**, **Retry extraction**). |
| **Dependencies / Config** | Frontend Vanilla JS/CSS; FastAPI routes in backend. |
| **Recommended Action** | Implement `GET /api/v1/documents?patient_id={id}` in backend. Add `loadRecentHealthActivity()` in `script.js` to populate `#timelineList` with real backend data on page load. Restyle `.timeline-item-body` with vertical wrapping and add action modals. |
| **Verified Test Results** | Verified via manual inspection: refreshing `frontend/index.html` renders hardcoded 2018 demo rows; live uploads only prepend in memory for the active browser session. |

---

### 10. Internationalization and Offline Support

| Attribute | Assessment |
| :--- | :--- |
| **Status** | **IMPLEMENTED** (Offline Execution) / **MISSING** (Tamil & Multilingual Pipeline) |
| **Evidence** | `backend/app/services/document_extractor.py`, `frontend/appointments.html` (language dropdown), environment network audit |
| **What Works Today** | **100% Offline Capability:** The entire document pipeline runs locally without internet connectivity. PaddleOCR models are stored on local disk (`.paddlex\official_models\`), PyMuPDF operates locally, SQLite is local (`hygia.db`), and remote network checks are suppressed (`PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True`). No third-party cloud APIs are called. |
| **What is Incomplete / Incorrect** | **Tamil / Multilingual Processing is Missing:** While `appointments.html` displays a language selector in the UI header, the backend pipeline is hardcoded to English (`lang="en"` with `en_PP-OCRv5_mobile_rec`). There is no Tamil OCR model configured, no Tamil medical synonym dictionary, and no multilingual extraction logic. |
| **Dependencies / Config** | PaddleOCR supports Tamil (`lang="ta"`), but Tamil recognition models would need to be downloaded and configured. |
| **Recommended Action** | Keep English pipeline stable. To support Tamil lab reports in future phases, add a language detection step and configure `lang="ta"` in PaddleOCR alongside a bilingual medical dictionary. |
| **Verified Test Results** | Pipeline verified running in isolated offline environment with zero external outbound HTTP calls. |

---

## Detailed Component Status Matrix

| # | Component | Status | Primary Code Location | Key Finding |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **PDF Text Extraction** | `IMPLEMENTED` | `app/services/document_extractor.py` | PyMuPDF extracts digital text in ~2ms; falls back to OCR per page. |
| **2** | **OCR Engine** | `IMPLEMENTED` | `app/services/document_extractor.py` | PaddleOCR PP-OCRv5 mobile with oneDNN CPU acceleration; RapidOCR/Tesseract absent. |
| **3** | **Layout Reconstruction** | `MISSING` | `app/services/document_extractor.py` | Discards bounding boxes (`dt_polys`); no 2D table row/column reconstruction. |
| **4** | **Rule-Based Extraction** | `PARTIALLY IMPLEMENTED` | `app/services/observation_extractor.py` | Only 13 tests recognized; fails on abbreviations, multiline, ranges, and flags. |
| **5** | **Medical NER** | `MISSING` | N/A | No scispaCy, MedCAT, terminology normalization, or negation detection. |
| **6** | **LLM-Based Extraction** | `MISSING` | N/A | No LLM provider, prompt schema, or cloud API integration. |
| **7** | **Validation & Evidence** | `PARTIALLY IMPLEMENTED` | `app/models/observation.py` | Evidence text and page saved; Pydantic validation, ranges, and flags missing. |
| **8** | **Data Storage & Review** | `PARTIALLY IMPLEMENTED` | `app/api/documents.py`, `app/models/` | DB persistence and duplicate skipping work; human review update endpoints missing. |
| **9** | **API & UI Integration** | `PARTIALLY IMPLEMENTED` | `app/api/documents.py`, `frontend/script.js` | Upload triggers extraction; Recent Activity lacks dynamic load, actions, and states. |
| **10** | **I18n & Offline Support** | `PARTIALLY IMPLEMENTED` | `app/services/document_extractor.py` | 100% offline and local; Tamil OCR and multilingual extraction absent. |

---

## Root Cause Analysis: "No structured lab parameters found"

When users upload medical lab documents in the current application, the system frequently returns the status message:
> *"Text extracted (X characters). No structured lab parameters found."*

Based on verified code evidence across `app/services/observation_extractor.py` and `app/services/document_extractor.py`, this outcome is caused by **five specific algorithmic bottlenecks**:

1. **Vocabulary Deficit (Missing Abbreviations):**
   Real-world clinical reports rarely print full formal names like `"fasting blood glucose"` or `"hemoglobin"`. They print `"FBS"`, `"PPBS"`, `"RBS"`, `"Hb"`, `"Hgb"`, `"HbA1c"`, `"BUN"`, `"Urea"`, `"PLT"`, or `"TLC"`. The existing `TEST_NAMES` dictionary contains only 13 full lowercase strings and **zero abbreviations**. Any report using standard clinical acronyms immediately yields 0 matches.

2. **Single-Line Boundary Failure (`splitlines()` Isolation):**
   PaddleOCR often splits a test name and its value into separate bounding boxes on separate lines (e.g., line 1: `Hemoglobin`, line 2: `14.2 g/dL 13.0-17.0`). Because `observation_extractor.py` inspects lines strictly in isolation (`for line in text.splitlines():`), line 1 has no number and line 2 has no test name. Both lines are rejected.

3. **Rigid Unidirectional Search (Value After Name Only):**
   The parser exclusively searches for numbers following the test name (`evidence[name_match.end():]`). In tabular reports where the measured value appears before or to the left of the test name, or in right-to-left OCR outputs, the parser is completely blind to the result.

4. **Reference Interval Number Collision:**
   When a reference interval is present (e.g. `Hemoglobin (12.0 - 16.0) 14.5 g/dL`), the regex `NUMBER = r"[-+]?\d+(?:[.,]\d+)?"` grabs the first number (`12.0`). Because `12.0` is followed by `- 16.0` rather than a recognized unit, unit validation fails or the reference range minimum is erroneously extracted as the measured value.

5. **Loss of Bounding Box Coordinates:**
   In `document_extractor.py`, `rec_texts` are concatenated without using `dt_polys` bounding boxes. When a multi-column table is read, columnar ordering can place all test names together followed by all numerical values, destroying the adjacency needed by regex matching.

---

## Prioritized Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Robust Rule-Based Clinical Parser & Layout Association       │
│ (Zero external dependencies; fixes root cause of 0 observations found) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Schema Validation, Review API Endpoints & Document Listing   │
│ (Adds GET /documents, PATCH /observations/{id}, Pydantic schemas)      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Dynamic Recent Health Activity UI & Interactive Modals        │
│ (Dynamic patient activity load, 4 data-driven states, View/Review UX) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Spatial 2D Table Reconstruction & Bounding Box Association    │
│ (Extracts dt_polys to align multi-column table rows accurately)        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Multilingual Support (Tamil) & Optional Local Clinical NER    │
│ (PaddleOCR lang="ta" configuration & clinical entity linking)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Robust Rule-Based Clinical Parser (Immediate Priority)
- **Dependencies:** None (uses existing Python `re`).
- **Actions:**
  1. Expand `observation_extractor.py` test dictionary to include clinical abbreviations and synonyms (`Hb`, `Hgb`, `FBS`, `PPBS`, `RBS`, `HbA1c`, `BUN`, `Urea`, `Uric Acid`, `Bilirubin`, `SGOT`, `SGPT`, `PLT`, `WBC`/`TLC`, `RBC`).
  2. Implement reference range pre-extraction so reference interval numbers (`13.0 - 17.0`, `< 200`, `> 40`) are extracted into `reference_range` and excluded from candidate result values.
  3. Support abnormal flag detection (`H`, `HIGH`, `L`, `LOW`, `*`, `CRITICAL`).
  4. Implement multi-line windowing (joining adjacent lines when a test name line is immediately followed by a value line).
  5. Support bidirectional value extraction (value before or after test name).

### Phase 2: Backend Review Endpoints & Patient Document Listing
- **Dependencies:** Phase 1.
- **Actions:**
  1. Add `GET /api/v1/documents?patient_id={id}` in `app/api/documents.py` to return all uploaded documents and extracted observation counts for a patient.
  2. Add `PATCH /api/v1/observations/{observation_id}` (or `POST /api/v1/documents/{doc_id}/observations/{obs_id}/review`) to update `review_status` to `'reviewed'` or `'corrected'`.
  3. Add Pydantic schemas in `app/schemas/observation.py` for structured validation.

### Phase 3: Dynamic Recent Health Activity UI & Modals
- **Dependencies:** Phase 2.
- **Actions:**
  1. Add `loadRecentHealthActivity()` in `frontend/script.js` to query `GET /api/v1/documents?patient_id={id}` on page load and populate `#timelineList` with real records instead of 2018 demo rows.
  2. Implement the 4 distinct data-driven states:
     - **Text extracted — Review required**
     - **Observations found — Pending review**
     - **Text extracted — No observations detected**
     - **Extraction failed — Retry available**
  3. Restyle `.timeline-item-body` to wrap cleanly on mobile and desktop without horizontal overflow.
  4. Implement **View extracted text** modal, **Review observations** modal, and **Retry extraction** handler.

### Phase 4: Spatial 2D Bounding-Box Table Reconstruction
- **Dependencies:** Phase 1 & 2.
- **Actions:**
  1. Preserve `dt_polys` from PaddleOCR inference in `document_extractor.py`.
  2. Implement vertical Y-axis band clustering to reconstruct table rows before passing text to the extractor.

### Phase 5: Multilingual Support (Tamil) & Offline NER
- **Dependencies:** Phase 4.
- **Actions:**
  1. Download and configure PaddleOCR Tamil model (`lang="ta"`).
  2. Build a bilingual Tamil/English clinical lab term dictionary for regional health records.

---

## Audit Verification & Test Execution Summary

The following test suites were directly executed in the virtual environment (`d:\HYGIA-\venv\Scripts\python -m pytest tests/`):

```
platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0
rootdir: D:\HYGIA-\backend
plugins: anyio-4.15.1
collected 11 items

tests\test_main.py ........                                              [ 72%]
tests\test_ocr_pipeline.py ...                                           [100%]

======================= 11 passed, 2 warnings in 6.38s =======================
```

### Verified Test Assertions:
1. `test_main.py::test_document_upload_and_extraction_pipeline`: Uploads synthetic PDF, verifies text extraction and observation extraction with `review_status="pending"`.
2. `test_ocr_pipeline.py::test_ocr_pipeline_selectable_pdf`: Verifies selectable PDF digital text extraction skips PaddleOCR with ~2 ms latency.
3. `test_ocr_pipeline.py::test_ocr_pipeline_scanned_pdf_fallback`: Verifies raster PDF triggers PaddleOCR fallback using in-memory array rendering.
4. `test_ocr_pipeline.py::test_ocr_pipeline_png_image`: Verifies standalone image OCR extraction.

**Audit Status:** AUDIT COMPLETE. All findings verified against current codebase and execution traces. No modification to database schemas or services made during this audit phase.

"""
Robust Clinical Laboratory Observation Extractor for HYGIA.

Deterministic, offline-first rule-based parser for laboratory reports:
- Expands clinical vocabulary to standard test names, aliases, and abbreviations:
  Hemoglobin (Hb, Hgb), Fasting Glucose (FBS, FBG), Postprandial Glucose (PPBS),
  Random Glucose (RBS), HbA1c (A1c), BUN, Urea, Creatinine, Platelets (PLT),
  WBC (TLC), RBC, Lipid panel (Total Chol, HDL, LDL, VLDL, Triglycerides),
  Liver enzymes (AST/SGOT, ALT/SGPT), Bilirubin, Uric Acid.
- Staged parsing pipeline:
  1. Whitespace & line normalization with line pairing for multiline OCR outputs.
  2. Noise & demographic masking (dates, patient age, IDs).
  3. Reference range extraction & masking (prevents range numbers from being misidentified as results).
  4. Abnormal flag detection (HIGH, LOW, CRITICAL, NORMAL, H, L).
  5. Bidirectional measured value extraction (value after test name, or value before test name).
  6. Unit extraction and normalization.
  7. Deduplication and candidate observation construction.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass
class ExtractedObservation:
    name: str
    value_text: str
    value_numeric: float | None
    unit: str | None
    reference_range: str | None
    evidence_text: str
    page_number: int | None = None
    flag: str | None = None
    code: str | None = None


# Comprehensive clinical laboratory definitions
# Format: (canonical_display_name, default_unit, list_of_aliases)
CLINICAL_TEST_DEFINITIONS = [
    (
        "Hemoglobin",
        "g/dL",
        [
            "hemoglobin",
            "haemoglobin",
            "hgb",
            "hb",
        ],
    ),
    (
        "Fasting Blood Glucose",
        "mg/dL",
        [
            "fasting blood glucose",
            "fasting blood sugar",
            "fasting plasma glucose",
            "fasting glucose",
            "blood glucose fasting",
            "fast glucose",
            "fbs",
            "fbg",
            "fpg",
        ],
    ),
    (
        "Postprandial Blood Glucose",
        "mg/dL",
        [
            "postprandial blood glucose",
            "post prandial blood glucose",
            "postprandial blood sugar",
            "post prandial blood sugar",
            "postprandial glucose",
            "post prandial glucose",
            "ppbs",
            "ppbg",
        ],
    ),
    (
        "Random Blood Glucose",
        "mg/dL",
        [
            "random blood glucose",
            "random blood sugar",
            "random glucose",
            "rbs",
        ],
    ),
    (
        "Glucose",
        "mg/dL",
        [
            "blood glucose",
            "serum glucose",
            "plasma glucose",
            "glucose",
        ],
    ),
    (
        "HbA1c",
        "%",
        [
            "glycated hemoglobin",
            "glycosylated hemoglobin",
            "glycohemoglobin",
            "hba1c",
            "hb a1c",
            "a1c",
        ],
    ),
    (
        "Blood Urea Nitrogen",
        "mg/dL",
        [
            "blood urea nitrogen",
            "bun",
        ],
    ),
    (
        "Urea",
        "mg/dL",
        [
            "blood urea",
            "serum urea",
            "s. urea",
            "urea",
        ],
    ),
    (
        "Creatinine",
        "mg/dL",
        [
            "serum creatinine",
            "s. creatinine",
            "s creatinine",
            "creatinine",
            "creat",
        ],
    ),
    (
        "Total Cholesterol",
        "mg/dL",
        [
            "total cholesterol",
            "cholesterol, total",
            "cholesterol total",
            "total chol",
            "cholesterol",
        ],
    ),
    (
        "HDL Cholesterol",
        "mg/dL",
        [
            "hdl cholesterol",
            "hdl-cholesterol",
            "hdl-c",
            "hdl direct",
            "hdl",
        ],
    ),
    (
        "LDL Cholesterol",
        "mg/dL",
        [
            "ldl cholesterol",
            "ldl-cholesterol",
            "ldl-c",
            "ldl direct",
            "ldl",
        ],
    ),
    (
        "VLDL Cholesterol",
        "mg/dL",
        [
            "vldl cholesterol",
            "vldl-cholesterol",
            "vldl-c",
            "vldl",
        ],
    ),
    (
        "Triglycerides",
        "mg/dL",
        [
            "serum triglycerides",
            "triglycerides",
            "triglyceride",
            "tg",
            "trig",
        ],
    ),
    (
        "Platelet Count",
        "10^3/uL",
        [
            "platelet count",
            "total platelet count",
            "platelets count",
            "platelets",
            "plt count",
            "plt",
            "thrombocytes",
        ],
    ),
    (
        "WBC",
        "10^3/uL",
        [
            "white blood cell count",
            "white blood cells",
            "total leukocyte count",
            "total leucocyte count",
            "wbc count",
            "tlc",
            "wbc",
        ],
    ),
    (
        "RBC",
        "10^6/uL",
        [
            "red blood cell count",
            "red blood cells",
            "total rbc count",
            "total rbc",
            "rbc count",
            "rbc",
        ],
    ),
    (
        "Uric Acid",
        "mg/dL",
        [
            "serum uric acid",
            "s. uric acid",
            "uric acid",
        ],
    ),
    (
        "Total Bilirubin",
        "mg/dL",
        [
            "total bilirubin",
            "bilirubin total",
            "serum bilirubin",
            "bilirubin",
        ],
    ),
    (
        "AST (SGOT)",
        "U/L",
        [
            "aspartate aminotransferase",
            "sgot/ast",
            "sgot",
            "ast",
        ],
    ),
    (
        "ALT (SGPT)",
        "U/L",
        [
            "alanine aminotransferase",
            "sgpt/alt",
            "sgpt",
            "alt",
        ],
    ),
]

# Backwards-compatibility dictionary for legacy imports
TEST_NAMES = {
    alias: (canonical, default_unit)
    for canonical, default_unit, aliases in CLINICAL_TEST_DEFINITIONS
    for alias in aliases
}

# Pre-compiled lookup list sorted by alias length descending (longest match wins)
_SORTED_ALIAS_LOOKUP: list[tuple[str, str, str]] = []
for canonical, default_unit, aliases in CLINICAL_TEST_DEFINITIONS:
    for alias in aliases:
        _SORTED_ALIAS_LOOKUP.append((alias.lower(), canonical, default_unit))
_SORTED_ALIAS_LOOKUP.sort(key=lambda item: len(item[0]), reverse=True)


# Common medical units regex
UNIT_PATTERN = re.compile(
    r"(?i)\b(mg/dl|g/dl|mmol/l|umol/l|µmol/l|10\^3/ul|10\^6/ul|10³/µl|10⁶/µl|"
    r"%|u/l|iu/l|k/ul|m/ul|cells/mcl|/cumm|lakh/cumm|g/l|fl|pg)\b"
)

# Numeric format (integer or decimal with dot or comma)
NUMBER_PATTERN = re.compile(r"[-+]?\d+(?:[.,]\d+)?")

# Reference range patterns
RANGE_PATTERNS = [
    # Explicit range: (13.0 - 17.0), Ref: 70 - 99, 0.7 to 1.3
    re.compile(
        r"(?:ref(?:erence)?(?:\s+(?:range|interval))?|normal|range)?\s*[:=\[]?\s*"
        r"(\(?\s*\d+(?:[.,]\d+)?\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?\s*\)?)"
        r"\s*\]?",
        re.IGNORECASE,
    ),
    # Threshold range: < 200, <= 140, > 40, >= 60, (<200)
    re.compile(
        r"(?:ref(?:erence)?(?:\s+(?:range|interval))?|normal|range)?\s*[:=\[]?\s*"
        r"(\(?\s*[<>]=?\s*\d+(?:[.,]\d+)?\s*\)?)"
        r"\s*\]?",
        re.IGNORECASE,
    ),
]

# Abnormal flag tokens
FLAG_PATTERN = re.compile(
    r"\b(HIGH|LOW|CRITICAL|PANIC|ABNORMAL|NORMAL|H|L)\b|\*",
    re.IGNORECASE,
)

# Patient demographic and date patterns to mask out
DEMOGRAPHIC_PATTERNS = [
    # Dates: 2026-10-10, 10/12/2026, 10-Oct-2026
    re.compile(r"\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b"),
    re.compile(r"\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b"),
    re.compile(r"\b\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2,4}\b", re.IGNORECASE),
    # Patient Age: Age: 45, 45 Y, 45 Years
    re.compile(r"(?i)\b(?:age|years|yr|yrs)\s*[:=]?\s*\d+\b"),
    # IDs: ID: 12345, MRN: 98765, Reg: 123
    re.compile(r"(?i)\b(?:id|mrn|reg|bill|phone|sample\s*id)\s*[:=]?\s*\d+\b"),
]


def _mask_spans(text: str, spans: list[tuple[int, int]]) -> str:
    """Replace character spans with spaces to keep string offsets intact."""
    chars = list(text)
    for start, end in spans:
        for i in range(start, min(end, len(chars))):
            chars[i] = " "
    return "".join(chars)


def parse_line_observation(
    evidence: str,
    page_number: int | None = None,
) -> ExtractedObservation | None:
    """Parse a single text line or paired-line candidate into an ExtractedObservation."""
    evidence_clean = evidence.strip()
    if not evidence_clean:
        return None

    lowered = evidence_clean.lower()

    # Step 1: Identify candidate test name (longest matching alias wins)
    matched_test = None
    for alias, canonical, default_unit in _SORTED_ALIAS_LOOKUP:
        # Strict word boundary check prevents short aliases like 'hb' from matching in 'this'
        pattern = rf"(?<![a-zA-Z0-9]){re.escape(alias)}(?![a-zA-Z0-9])"
        match = re.search(pattern, lowered)
        if match:
            matched_test = (alias, canonical, default_unit, match)
            break

    if matched_test is None:
        return None

    alias, canonical, default_unit, name_match = matched_test
    name_start, name_end = name_match.span()

    # Step 2: Extract Reference Range first (and record span to mask its numbers)
    masked_spans: list[tuple[int, int]] = []
    extracted_range: str | None = None

    for r_pat in RANGE_PATTERNS:
        r_match = r_pat.search(evidence_clean)
        if r_match:
            raw_range = r_match.group(1).strip("()[] ")
            extracted_range = raw_range
            masked_spans.append(r_match.span())
            break

    # Step 3: Mask non-result noise (demographics, dates, test name itself)
    for demo_pat in DEMOGRAPHIC_PATTERNS:
        for d_match in demo_pat.finditer(evidence_clean):
            masked_spans.append(d_match.span())

    # Mask test name span so letters don't interfere
    masked_spans.append((name_start, name_end))

    # Step 4: Extract abnormal flag
    extracted_flag: str | None = None
    f_match = FLAG_PATTERN.search(evidence_clean)
    if f_match:
        raw_flag = f_match.group(0).upper()
        if raw_flag in {"H", "HIGH"}:
            extracted_flag = "HIGH"
        elif raw_flag in {"L", "LOW"}:
            extracted_flag = "LOW"
        elif raw_flag in {"NORMAL", "N"}:
            extracted_flag = "NORMAL"
        elif raw_flag in {"CRITICAL", "PANIC", "ABNORMAL", "*"}:
            extracted_flag = "ABNORMAL"
        masked_spans.append(f_match.span())

    # Step 5: Extract unit
    extracted_unit: str | None = None
    u_match = UNIT_PATTERN.search(evidence_clean)
    if u_match:
        raw_u = u_match.group(0)
        # Normalize unit casing
        u_lower = raw_u.lower()
        if "mg/dl" in u_lower:
            extracted_unit = "mg/dL"
        elif "g/dl" in u_lower:
            extracted_unit = "g/dL"
        elif "mmol/l" in u_lower:
            extracted_unit = "mmol/L"
        elif "10^3/ul" in u_lower or "10³/µl" in u_lower:
            extracted_unit = "10^3/uL"
        elif "10^6/ul" in u_lower or "10⁶/µl" in u_lower:
            extracted_unit = "10^6/uL"
        elif "%" in u_lower:
            extracted_unit = "%"
        elif "u/l" in u_lower or "iu/l" in u_lower:
            extracted_unit = "U/L"
        else:
            extracted_unit = raw_u
        masked_spans.append(u_match.span())
    else:
        # Fallback to test definition default unit only if evidence context is strongly lab-like
        extracted_unit = default_unit

    # Build masked string where ranges, demographics, and flags are blanked out
    searchable_text = _mask_spans(evidence_clean, masked_spans)

    # Step 6: Measured Result Value Extraction (Bidirectional)
    # First: look for numbers AFTER test name
    after_text = searchable_text[name_end:]
    val_match = NUMBER_PATTERN.search(after_text)
    value_text = None

    if val_match:
        candidate_val = val_match.group(0)
        value_text = candidate_val
    else:
        # Second: look for numbers BEFORE test name (inverted table or value-first layout)
        before_text = searchable_text[:name_start]
        before_matches = list(NUMBER_PATTERN.finditer(before_text))
        if before_matches:
            # Take the closest number before the test name
            value_text = before_matches[-1].group(0)

    if not value_text:
        return None

    # Clean and parse numeric value
    try:
        cleaned_num = value_text.replace(",", ".")
        value_numeric = float(cleaned_num)
        # Sanity check: discard negative numbers or implausible extreme figures (> 100000)
        if value_numeric < 0 or value_numeric > 100000:
            return None
    except ValueError:
        value_numeric = None

    return ExtractedObservation(
        name=canonical,
        value_text=value_text,
        value_numeric=value_numeric,
        unit=extracted_unit,
        reference_range=extracted_range,
        evidence_text=evidence_clean,
        page_number=page_number,
        flag=extracted_flag,
        code=extracted_flag,
    )


def extract_observations(
    pages: list[dict[str, Any]],
) -> list[ExtractedObservation]:
    """Extract candidate laboratory results from document pages.

    Candidates require human review; this function does not
    interpret results or provide medical advice.
    """
    observations: list[ExtractedObservation] = []
    seen: set[tuple[str, str, int | None]] = set()

    for page in pages:
        page_number = page.get("page_number")
        text = page.get("extracted_text", "")
        if not text:
            continue

        raw_lines = [line.strip() for line in text.splitlines() if line.strip()]

        i = 0
        while i < len(raw_lines):
            line = raw_lines[i]

            # 1. Try parsing single line first
            obs = parse_line_observation(line, page_number)

            if obs is not None:
                key = (obs.name.lower(), obs.value_text, page_number)
                if key not in seen:
                    seen.add(key)
                    observations.append(obs)
                i += 1
                continue

            # 2. Multiline pairing: if current line has test name but no result,
            # pair with next line if available
            if i + 1 < len(raw_lines):
                paired_line = f"{line} {raw_lines[i + 1]}"
                obs_paired = parse_line_observation(paired_line, page_number)
                if obs_paired is not None:
                    key = (obs_paired.name.lower(), obs_paired.value_text, page_number)
                    if key not in seen:
                        seen.add(key)
                        observations.append(obs_paired)
                    i += 2  # consume both lines
                    continue

            i += 1

    return observations

import re
import pymupdf
from dataclasses import dataclass
@dataclass
class ExtractedObservation:
    name: str
    value_text: str
    value_numeric: float | None
    unit: str | None
    reference_range: str | None
    evidence_text: str
    page_number: int | None = None
TEST_NAMES = {
    "hemoglobin": ("Hemoglobin", "g/dL"),
    "haemoglobin": ("Hemoglobin", "g/dL"),
    "fasting blood glucose": ("Fasting Blood Glucose", "mg/dL"),
    "blood glucose": ("Blood Glucose", "mg/dL"),
    "glucose": ("Glucose", "mg/dL"),
    "creatinine": ("Creatinine", "mg/dL"),
    "total cholesterol": ("Total Cholesterol", "mg/dL"),
    "hdl cholesterol": ("HDL Cholesterol", "mg/dL"),
    "ldl cholesterol": ("LDL Cholesterol", "mg/dL"),
    "triglycerides": ("Triglycerides", "mg/dL"),
    "platelet count": ("Platelet Count", "10^3/uL"),
    "wbc": ("WBC", "10^3/uL"),
    "rbc": ("RBC", "10^6/uL"),
}
NUMBER = r"[-+]?\d+(?:[.,]\d+)?"
RANGE = rf"(?:{NUMBER}\s*(?:-|–|to)\s*{NUMBER})"
def extract_observations(
    pages: list[dict],
) -> list[ExtractedObservation]:
    observations = []
    seen = set()
    test_names = sorted(
        TEST_NAMES.items(),
        key=lambda item: len(item[0]),
        reverse=True,
    )
    for page in pages:
        page_number = page.get("page_number")
        text = page.get("extracted_text", "")
        for line in text.splitlines():
            evidence = line.strip()
            if not evidence:
                continue
            lowered = evidence.lower()
            matched = None
            for test_key, (display_name, _) in test_names:
                match = re.search(
                    rf"(?<![a-z]){re.escape(test_key)}(?![a-z])",
                    lowered,
                )
                if match:
                    matched = (test_key, display_name, match)
                    break
            if matched is None:
                continue
            test_key, display_name, name_match = matched
            after_name = evidence[name_match.end():]
            value_match = re.search(NUMBER, after_name)
            if not value_match:
                continue
            value_text = value_match.group(0)
            try:
                value_numeric = float(value_text.replace(",", "."))
            except ValueError:
                value_numeric = None
            unit_match = re.search(
                r"(?i)(mg/dl|g/dl|mmol/l|10\^3/ul|10\^6/ul|"
                r"10³/µl|10⁶/µl|%|u/l|iu/l)",
                after_name[value_match.end():],
            )
            unit = unit_match.group(0) if unit_match else None
            reference_range = None
            key = (
                display_name.lower(),
                value_text,
                unit,
                page_number,
                evidence,
            )
            if key in seen:
                continue
            seen.add(key)
            observations.append(
                ExtractedObservation(
                    name=display_name,
                    value_text=value_text,
                    value_numeric=value_numeric,
                    unit=unit,
                    reference_range=reference_range,
                    evidence_text=evidence,
                    page_number=page_number,
                )
            )
    return observations

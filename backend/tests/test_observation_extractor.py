"""
Unit tests for the expanded robust observation extractor (Phase 1).
"""
import pytest
from app.services.observation_extractor import extract_observations, parse_line_observation


def test_abbreviations_and_synonyms():
    # Test Hb, FBS, PPBS, RBS, HbA1c, BUN, Urea, PLT, TLC, RBC
    text = (
        "Hb: 13.5 g/dL (12.0 - 16.0)\n"
        "FBS: 98 mg/dL (70 - 99)\n"
        "PPBS: 132 mg/dL (< 140)\n"
        "RBS: 110 mg/dL (< 140)\n"
        "HbA1c: 5.4 % (4.0 - 5.6)\n"
        "BUN: 16 mg/dL (7 - 20)\n"
        "Urea: 32 mg/dL (15 - 45)\n"
        "Creatinine: 0.9 mg/dL (0.7 - 1.3)\n"
        "PLT: 230 10^3/uL (150 - 450)\n"
        "TLC: 6.5 10^3/uL (4.0 - 11.0)\n"
        "RBC: 4.8 10^6/uL (4.2 - 5.8)\n"
        "Total Chol: 185 mg/dL (< 200)\n"
        "HDL-C: 45 mg/dL (> 40)\n"
        "LDL-C: 105 mg/dL (< 100)\n"
        "TG: 140 mg/dL (< 150)\n"
        "SGOT: 24 U/L (10 - 40)\n"
        "SGPT: 28 U/L (10 - 40)\n"
    )
    pages = [{"page_number": 1, "extracted_text": text}]
    observations = extract_observations(pages)

    obs_map = {o.name: o for o in observations}

    assert "Hemoglobin" in obs_map
    assert obs_map["Hemoglobin"].value_numeric == 13.5
    assert obs_map["Hemoglobin"].unit == "g/dL"
    assert obs_map["Hemoglobin"].reference_range == "12.0 - 16.0"

    assert "Fasting Blood Glucose" in obs_map
    assert obs_map["Fasting Blood Glucose"].value_numeric == 98.0

    assert "Postprandial Blood Glucose" in obs_map
    assert obs_map["Postprandial Blood Glucose"].value_numeric == 132.0

    assert "Random Blood Glucose" in obs_map
    assert obs_map["Random Blood Glucose"].value_numeric == 110.0

    assert "HbA1c" in obs_map
    assert obs_map["HbA1c"].value_numeric == 5.4
    assert obs_map["HbA1c"].unit == "%"

    assert "Blood Urea Nitrogen" in obs_map
    assert obs_map["Blood Urea Nitrogen"].value_numeric == 16.0

    assert "Urea" in obs_map
    assert obs_map["Urea"].value_numeric == 32.0

    assert "Creatinine" in obs_map
    assert obs_map["Creatinine"].value_numeric == 0.9

    assert "Platelet Count" in obs_map
    assert obs_map["Platelet Count"].value_numeric == 230.0

    assert "WBC" in obs_map
    assert obs_map["WBC"].value_numeric == 6.5

    assert "RBC" in obs_map
    assert obs_map["RBC"].value_numeric == 4.8

    assert "Total Cholesterol" in obs_map
    assert "HDL Cholesterol" in obs_map
    assert "LDL Cholesterol" in obs_map
    assert "Triglycerides" in obs_map
    assert "AST (SGOT)" in obs_map
    assert "ALT (SGPT)" in obs_map


def test_abnormal_flags():
    # Test HIGH, LOW, H, L, CRITICAL
    text = (
        "Hemoglobin 10.2 g/dL L (12.0 - 16.0)\n"
        "Fasting Blood Glucose: 135 mg/dL HIGH (70-99)\n"
        "Total Cholesterol: 245 mg/dL H (< 200)\n"
    )
    pages = [{"page_number": 1, "extracted_text": text}]
    observations = extract_observations(pages)
    obs_map = {o.name: o for o in observations}

    assert obs_map["Hemoglobin"].flag == "LOW"
    assert obs_map["Fasting Blood Glucose"].flag == "HIGH"
    assert obs_map["Total Cholesterol"].flag == "HIGH"


def test_reference_range_pre_extraction_does_not_override_result():
    # When range appears before result, result is still parsed correctly
    text = "Hemoglobin (Ref: 12.0 - 16.0) 14.5 g/dL"
    obs = parse_line_observation(text)
    assert obs is not None
    assert obs.name == "Hemoglobin"
    assert obs.value_numeric == 14.5
    assert obs.reference_range == "12.0 - 16.0"


def test_multiline_ocr_pairing():
    # When test name is on line 1 and result on line 2
    text = (
        "Hemoglobin\n"
        "14.2 g/dL (13.0 - 17.0)\n"
        "Fast Glucose\n"
        "95 mg/dL\n"
    )
    pages = [{"page_number": 1, "extracted_text": text}]
    observations = extract_observations(pages)
    obs_map = {o.name: o for o in observations}

    assert "Hemoglobin" in obs_map
    assert obs_map["Hemoglobin"].value_numeric == 14.2

    assert "Fasting Blood Glucose" in obs_map
    assert obs_map["Fasting Blood Glucose"].value_numeric == 95.0


def test_inverted_value_before_name():
    # Inverted layout where number precedes test name
    text = "14.2 g/dL Hemoglobin (13.0 - 17.0)"
    obs = parse_line_observation(text)
    assert obs is not None
    assert obs.name == "Hemoglobin"
    assert obs.value_numeric == 14.2


def test_noise_and_demographic_masking():
    # Age, Dates, and IDs should never be extracted as results
    text = (
        "Patient Age: 45 Date: 2026-10-10 Sample ID: 98234\n"
        "Hemoglobin: 14.2 g/dL (13.0 - 17.0)\n"
    )
    pages = [{"page_number": 1, "extracted_text": text}]
    observations = extract_observations(pages)

    assert len(observations) == 1
    assert observations[0].name == "Hemoglobin"
    assert observations[0].value_numeric == 14.2


def test_narrative_text_zero_observations():
    # Normal clinical notes without lab parameters must return 0 observations
    text = (
        "Patient presented with chronic headache and mild sinus pressure.\n"
        "Lungs clear to auscultation. Neurological exam intact.\n"
        "Recommended increased hydration and follow-up in two weeks.\n"
    )
    pages = [{"page_number": 1, "extracted_text": text}]
    observations = extract_observations(pages)
    assert len(observations) == 0

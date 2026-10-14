from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models import Patient
from ..schemas import PatientCreate, PatientResponse

router = APIRouter(prefix="/patients", tags=["Patients"])
@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
) -> Patient:
    patient = Patient(display_name=payload.display_name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient
@router.get("", response_model=list[PatientResponse])
def list_patients(
    db: Session = Depends(get_db),
) -> list[Patient]:
    """Retrieve list of all registered patients."""
    return db.query(Patient).order_by(Patient.created_at.desc()).all()
@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    return patient
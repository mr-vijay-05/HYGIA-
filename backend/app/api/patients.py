from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models import Patient, User
from ..schemas import PatientCreate, PatientResponse
from .deps import get_current_user

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(
    payload: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Patient:
    """Create a new patient record (requires authenticated session)."""
    patient = Patient(display_name=payload.display_name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=list[PatientResponse])
def list_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Patient]:
    """Retrieve list of all registered patients (requires authenticated session)."""
    return db.query(Patient).order_by(Patient.created_at.desc()).all()


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Patient:
    """Retrieve patient by ID (requires authenticated session)."""
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    return patient
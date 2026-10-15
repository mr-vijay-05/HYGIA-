from sqlalchemy.orm import Session
from .. import models
from ..core.security import hash_password
from ..db.session import Base, SessionLocal, engine
from ..models import Patient, User


def init_db() -> None:
    """Create all database tables and seed baseline demo accounts if not present."""
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 1. Seed demo patient user (Kavin S)
        demo_patient_email = "kavin@hygia.com"
        kavin_user = db.query(User).filter(User.email == demo_patient_email).first()
        if not kavin_user:
            # Check or create linked Patient record
            kavin_patient = db.query(Patient).filter(
                Patient.display_name.ilike("%Kavin%")
            ).first()
            if not kavin_patient:
                kavin_patient = Patient(display_name="Kavin S")
                db.add(kavin_patient)
                db.commit()
                db.refresh(kavin_patient)

            kavin_user = User(
                email=demo_patient_email,
                hashed_password=hash_password("demo123"),
                display_name="Kavin S",
                role="patient",
                patient_id=kavin_patient.id,
            )
            db.add(kavin_user)
            db.commit()

        # 2. Seed demo family caregiver user (Priya S)
        demo_family_email = "priya@hygia.com"
        priya_user = db.query(User).filter(User.email == demo_family_email).first()
        if not priya_user:
            priya_user = User(
                email=demo_family_email,
                hashed_password=hash_password("demo123"),
                display_name="Priya S",
                role="family",
                patient_id=None,
            )
            db.add(priya_user)
            db.commit()

    finally:
        db.close()

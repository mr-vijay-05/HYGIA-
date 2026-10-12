import app.models
from app.db.session import Base, engine


def init_db() -> None:
    """Create missing database tables."""
    Base.metadata.create_all(bind=engine)

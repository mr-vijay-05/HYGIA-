# HYGIA-
AI-powered personal health copilot for understanding and organizing medical records
# HYGIA- AI-Powered Health Copilot

HYGIA- is a personal health assistant that uses AI to help you understand, organize, and get insights from your medical records.

## ✨ Features

- 🏥 **Smart Document Organization**: Automatically categorizes your medical documents (reports, prescriptions, lab results)
- 🔍 **Medical Insight Extraction**: Uses AI to identify key information like conditions, medications, and measurements
- ⏰ **Timeline View**: Visualizes your health history in a chronological timeline
- 🛡️ **Data Security**: End-to-end encryption with privacy-first architecture
- 🎙️ **Voice-First Interface**: Designed for natural interaction and quick queries

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- pip (Python package installer)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd HYGIA-
```

2. **Create a virtual environment**
```bash
python -m venv venv
.\venv\Scripts\Activate  # Windows
# source venv/bin/activate  # macOS/Linux
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the development server**
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## 📋 API Endpoints

### Root
- `GET /`: Welcome message
- `GET /health`: Health check

### API v1
- `GET /api/v1/health`: API health check
- `POST /api/v1/documents`: Upload a new medical document
- `GET /api/v1/documents`: List all documents
- `GET /api/v1/documents/{doc_id}`: Get document details
- `POST /api/v1/documents/{doc_id}/process`: Trigger AI processing
- `GET /api/v1/documents/{doc_id}/observations`: Get extracted medical data
- `POST /api/v1/documents/{doc_id}/observations/{obs_id}/review`: Review and correct observations
- `GET /api/v1/patients`: List all patients
- `GET /api/v1/patients/{patient_id}`: Get patient details

## 📋 Environment Variables

Create a `.env` file in the backend directory:

```env
PROJECT_NAME="HYGIA- Health Copilot"
VERSION="1.0.0"
DESCRIPTION="AI-powered personal health copilot"
API_V1_STR="/api/v1"
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
DATABASE_URL="sqlite:///./hygia.db"  # Change for production
```

## 🧪 Testing

Run the test suite:

```bash
.\venv\Scripts\pytest.exe backend/tests -v
```

## 🏗️ Architecture

```
backend/
├── app/
│   ├── api/         # API endpoints and routes
│   │   ├── endpoints/ # Endpoint handlers
│   │   └── api.py   # API router
│   ├── core/        # Configuration and settings
│   ├── db/          # Database models and session management
│   ├── models/      # SQLAlchemy database models
│   ├── services/    # Business logic and AI integrations
│   └── main.py      # Application entry point
├── tests/           # Unit and integration tests
├── requirements.txt # Dependencies
├── Dockerfile       # Containerization (optional)
└── .env             # Environment variables
```

## 🛠️ Development

### Adding New Models

1. Create a new file in `app/models/`
2. Define your SQLAlchemy model
3. Add it to `app/models/__init__.py`
4. Run `alembic upgrade head` to create the table

### Adding New Endpoints

1. Create a new file in `app/api/endpoints/`
2. Define your endpoint functions
3. Register the router in `app/api/api.py`
4. Add type hints and Pydantic schemas

## 🔐 Security Considerations

- All data should be encrypted at rest and in transit
- Use environment variables for sensitive configuration
- Implement proper authentication and authorization
- Validate all user inputs

## 📦 Deployment

For production deployment:

1. Use a production-grade database (PostgreSQL, MySQL, etc.)
2. Set up proper authentication and rate limiting
3. Configure SSL/TLS for HTTPS
4. Use a production WSGI server (Gunicorn, Uvicorn)
5. Configure logging and monitoring

## 🤝 Contributing

1. Create a feature branch
2. Follow the coding standards (PEP 8)
3. Add unit tests for new features
4. Open a pull request with a clear description

## 📝 License

[MIT License](LICENSE)

## 📧 Contact

For questions or support, please contact [your name/team] or open an issue on GitHub.

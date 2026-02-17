# Backend for Telemedicine Platform

## Development Setup

### Prerequisites
- Python 3.11+
- uv (Python package manager)
- PostgreSQL (running in Docker)

### Quick Start

```bash
# 1. Create virtual environment
make venv

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Install dependencies
make requirements

# 4. Install test dependencies
make requirements-test

# 5. Run linting
make lint

# 6. Run tests
make unit-tests
```

### One-Command Setup

```bash
# Complete development setup
make dev-setup
```

## Development Commands

```bash
# Virtual environment
make venv                    # Create .venv with uv
make requirements           # Install dependencies
make requirements-test      # Install test dependencies

# Code quality
make lint                   # Run flake8, black, isort
make unit-tests            # Run pytest with coverage

# Database
alembic upgrade head        # Run migrations
alembic revision --autogenerate -m "description"  # Create migration
```

## Project Structure

```
backend/
├── app/
│   ├── api/               # API endpoints
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── payments.py    # Stripe webhooks
│   │   ├── video.py       # Jitsi integration
│   │   └── api_v1.py      # API router
│   ├── core/              # Security and config
│   │   ├── config.py      # Settings
│   │   └── security.py    # JWT, password hashing
│   ├── db/                # Database session
│   │   └── session.py     # SQLAlchemy session
│   ├── models/            # SQLAlchemy models
│   │   ├── user.py        # User model
│   │   └── consultation.py # Consultation, Payment models
│   ├── schemas/           # Pydantic schemas
│   │   ├── user.py        # User schemas
│   │   └── consultation.py # Consultation schemas
│   ├── services/          # Business logic
│   │   └── email.py       # SendGrid service
│   └── main.py            # FastAPI app
├── tests/                 # Test files
├── alembic/               # Database migrations
├── pyproject.toml         # Project configuration
└── requirements.txt        # Legacy requirements
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# Security
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Jitsi
JITSI_DOMAIN=meet.yourdomain.com
```

## Running Locally

```bash
# Start database
docker-compose -f ../infra/docker-compose.yml up -d db

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Testing

```bash
# Run all tests
make unit-tests

# Run specific test file
uv run pytest tests/test_auth.py -v

# Run with coverage
uv run pytest tests/ --cov=app --cov-report=html

# Run type checking
uv run mypy app/
```

## Code Quality

The project uses several tools to maintain code quality:

- **Black**: Code formatting
- **isort**: Import sorting
- **flake8**: Linting
- **mypy**: Type checking
- **pytest**: Testing framework

### Pre-commit Hooks

```bash
# Install pre-commit hooks
uv run pre-commit install

# Run pre-commit on all files
uv run pre-commit run --all-files
```

## API Documentation

When running locally:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Add consultation table"

# Apply migrations
alembic upgrade head

# Downgrade migration
alembic downgrade -1
```

## Deployment

The backend is deployed using Docker. See the main README for deployment instructions.

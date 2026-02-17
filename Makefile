# Telemedicine Platform Makefile

INFRA_DIR = infra
COMPOSE_FILE = $(INFRA_DIR)/docker-compose.yml

.PHONY: setup deploy down undeploy logs backup check help venv requirements requirements-frontend requirements-test lint unit-tests debug debug-frontend debug-db multidebug

help:
	@echo "Available commands:"
	@echo "  make setup           - Generate .env files and encryption keys"
	@echo "  make check           - Check system requirements and configuration"
	@echo "  make deploy          - Start the infrastructure using Docker Compose"
	@echo "  make down            - Stop and remove containers"
	@echo "  make undeploy        - Stop containers and remove volumes (complete cleanup)"
	@echo "  make logs            - View logs from all services"
	@echo "  make backup          - Create an encrypted backup of the database"
	@echo ""
	@echo "Development commands:"
	@echo "  make venv            - Create virtual environment with uv"
	@echo "  make requirements    - Install backend dependencies"
	@echo "  make requirements-frontend - Install frontend dependencies"
	@echo "  make requirements-test - Install test dependencies"
	@echo "  make lint            - Run code linting"
	@echo "  make unit-tests      - Run unit tests"
	@echo "  make debug           - Run backend with debugpy (waits for debugger attach)"
	@echo "  make debug-frontend  - Run frontend in dev mode"
	@echo "  make debug-db        - Start only the database container"
	@echo "  make multidebug      - Start db + run backend debug + frontend dev"

setup:
	@echo "Generating .env file..."
	@if [ ! -f .env ]; then \
		echo "POSTGRES_USER=telemed_user" > .env; \
		echo "POSTGRES_PASSWORD=$$(openssl rand -hex 16)" >> .env; \
		echo "POSTGRES_DB=telemed_db" >> .env; \
		echo "SECRET_KEY=$$(openssl rand -hex 32)" >> .env; \
		echo "ENCRYPTION_KEY=$$(python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())' 2>/dev/null || echo 'CHANGE_ME_INSTALL_CRYPTOGRAPHY')" >> .env; \
		echo "STRIPE_SECRET_KEY=sk_test_..." >> .env; \
		echo "SENDGRID_API_KEY=SG...." >> .env; \
		echo ".env file created with generated secrets."; \
	else \
		echo ".env already exists. Skipping generation."; \
	fi

deploy:
	@echo "Deploying infrastructure..."
	docker compose -f $(COMPOSE_FILE) --env-file .env up -d --build

down:
	@echo "Stopping infrastructure..."
	docker compose -f $(COMPOSE_FILE) down

undeploy:
	@echo "Stopping infrastructure and removing volumes..."
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

backup:
	@echo "Creating encrypted database backup..."
	@mkdir -p backups
	@docker exec telemed_db pg_dump -U telemed_user telemed_db | gzip | openssl enc -aes-256-cbc -salt -out backups/db_backup_$$(date +%F_%H-%M-%S).sql.gz.enc -pass pass:$$(grep SECRET_KEY .env | cut -d= -f2)
	@echo "Backup saved to backups/"

check:
	@echo "=== System Requirements Check ==="
	@echo "Checking Docker installation..."
	@if command -v docker >/dev/null 2>&1; then \
		echo "✅ Docker is installed: $$(docker --version)"; \
	else \
		echo "❌ Docker is not installed. Please install Docker."; \
		exit 1; \
	fi
	@echo "Checking Docker Compose installation..."
	@if command -v docker-compose >/dev/null 2>&1; then \
		echo "✅ Docker Compose is installed: $$(docker-compose --version)"; \
	else \
		if docker compose version >/dev/null 2>&1; then \
			echo "✅ Docker Compose (plugin) is installed: $$(docker compose version)"; \
		else \
			echo "❌ Docker Compose is not installed. Please install Docker Compose."; \
			exit 1; \
		fi; \
	fi
	@echo ""
	@echo "=== Configuration Check ==="
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Run 'make setup' first."; \
		exit 1; \
	else \
		echo "✅ .env file exists"; \
	fi
	@echo "Checking required environment variables..."
	@missing_vars=""; \
	for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB SECRET_KEY ENCRYPTION_KEY; do \
		if grep -q "^$${var}=" .env && ! grep -q "^$${var}=CHANGE_ME\|^$${var}=$$" .env; then \
			echo "✅ $${var} is set"; \
		else \
			echo "❌ $${var} is missing or not configured"; \
			missing_vars="$$missing_vars $$var"; \
		fi; \
	done; \
	if [ -n "$$missing_vars" ]; then \
		echo ""; \
		echo "❌ Missing required variables:$$missing_vars"; \
		exit 1; \
	fi
	@echo "Checking optional environment variables..."
	@optional_vars="STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SENDGRID_API_KEY JITSI_DOMAIN"; \
	for var in $$optional_vars; do \
		if grep -q "^$${var}=" .env && ! grep -q "^$${var}=sk_test_\.\.\.\|^$${var}=SG\.\.\.\|^$${var}=meet\." .env; then \
			echo "✅ $${var} is configured"; \
		else \
			echo "⚠️  $${var} is not configured (placeholder value)"; \
		fi; \
	done
	@echo ""
	@echo "=== File Structure Check ==="
	@required_files="infra/docker-compose.yml backend/app/main.py backend/requirements.txt frontend/package.json"; \
	for file in $$required_files; do \
		if [ -f $$file ]; then \
			echo "✅ $$file exists"; \
		else \
			echo "❌ $$file is missing"; \
			exit 1; \
		fi; \
	done
	@echo ""
	@echo "=== Port Availability Check ==="
	@ports="8080 5432"; \
	for port in $$ports; do \
		if netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			echo "⚠️  Port $$port is already in use"; \
		else \
			echo "✅ Port $$port is available"; \
		fi; \
	done
	@echo ""
	@echo "=== Python Dependencies Check ==="
	@if [ -d "backend" ]; then \
		if [ -x "backend/.venv/bin/python" ]; then \
			cd backend && .venv/bin/python -c "import fastapi, sqlalchemy, psycopg2, cryptography" 2>/dev/null && echo "✅ Backend Python dependencies are available" || echo "⚠️  Some backend dependencies may be missing. Run 'make requirements'"; cd ..; \
		elif [ -x ".venv/bin/python" ]; then \
			cd backend && ../.venv/bin/python -c "import fastapi, sqlalchemy, psycopg2, cryptography" 2>/dev/null && echo "✅ Backend Python dependencies are available" || echo "⚠️  Some backend dependencies may be missing. Run 'make requirements'"; cd ..; \
		else \
			cd backend && python3 -c "import fastapi, sqlalchemy, psycopg2, cryptography" 2>/dev/null && echo "✅ Backend Python dependencies are available" || echo "⚠️  Some backend dependencies may be missing. Run 'make requirements'"; cd ..; \
		fi; \
	fi
	@echo ""
	@echo "=== Node.js Dependencies Check ==="
	@if [ -d "frontend" ]; then \
		if [ -d "frontend/node_modules" ]; then \
			echo "✅ Frontend dependencies are installed"; \
		else \
			echo "⚠️  Frontend dependencies not installed. Run 'cd frontend && npm install'"; \
		fi; \
	fi
	@echo ""
	@echo "=== Check Complete ==="
	@echo "✅ System is ready for deployment!"
	@echo "Run 'make deploy' to start the platform."

# Development commands
venv:
	@echo "Creating virtual environment..."
	uv venv .venv
	@echo "✅ Virtual environment created at .venv"
	@echo "Run 'source .venv/bin/activate' to activate"

requirements: venv
	@echo "Installing backend requirements..."
	cd backend && UV_PROJECT_ENVIRONMENT=../.venv uv sync
	@echo "✅ Backend requirements installed"

requirements-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ Frontend dependencies installed"

requirements-test: requirements
	@echo "Installing test requirements..."
	cd backend && uv sync --group test
	@echo "✅ Test requirements installed"

lint:
	@echo "Running linting..."
	cd backend && uv run flake8 app/ --max-line-length=88 --ignore=E203,W503
	cd backend && uv run black --check app/
	cd backend && uv run isort --check-only app/
	@echo "✅ Linting passed"

unit-tests:
	@echo "Running unit tests..."
	cd backend && uv run pytest tests/ -v --tb=short
	@echo "✅ Unit tests passed"

debug-db:
	@echo "Starting database container..."
	docker compose -f $(COMPOSE_FILE) --env-file .env up -d db

debug:
	@cd backend && UV_PROJECT_ENVIRONMENT=../.venv uv run python -c "import debugpy" >/dev/null 2>&1 || (echo "❌ debugpy is not installed in the backend environment. Run 'make requirements' or install it with uv in backend." && exit 1)
	@if [ "$$WAIT_FOR_DEBUGGER" = "1" ]; then \
		echo "Starting backend debugger on 0.0.0.0:5678 (waiting for attach)..."; \
	else \
		echo "Starting backend debugger on 0.0.0.0:5678..."; \
	fi
	@set -a; [ -f .env ] && . ./.env; set +a; \
		cd backend && UV_PROJECT_ENVIRONMENT=../.venv uv run python -m debugpy --listen 0.0.0.0:5678 $$( [ "$$WAIT_FOR_DEBUGGER" = "1" ] && echo "--wait-for-client" ) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

debug-frontend:
	@echo "Starting frontend dev server..."
	cd frontend && npm run dev

multidebug: debug-db
	@$(MAKE) -j 2 debug debug-frontend

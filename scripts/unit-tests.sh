#!/bin/bash

# Unit tests script for Telemedicine Platform
# Usage: ./scripts/unit-tests.sh [PYTHON_VERSION]

PYTHON_VERSION=${1:-"3.11"}

echo "=== Running Unit Tests for Python ${PYTHON_VERSION} ==="

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "❌ No virtual environment detected. Please activate your virtual environment first."
    echo "Run: source .venv/bin/activate"
    exit 1
fi

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Please install uv first."
    echo "Run: pip install uv"
    exit 1
fi

# Navigate to backend directory
cd backend || exit 1

# Check if pyproject.toml exists
if [ ! -f "pyproject.toml" ]; then
    echo "❌ pyproject.toml not found in backend directory"
    exit 1
fi

# Run tests with pytest
echo "Running pytest..."
if uv run pytest tests/ -v --tb=short --cov=app --cov-report=term-missing --cov-report=html; then
    echo "✅ All tests passed!"
    echo "📊 Coverage report generated in htmlcov/"
else
    echo "❌ Some tests failed"
    exit 1
fi

# Run type checking
echo "Running type checking..."
if uv run mypy app/ --ignore-missing-imports; then
    echo "✅ Type checking passed!"
else
    echo "⚠️  Type checking found issues (non-blocking)"
fi

echo "=== Unit Tests Complete ==="

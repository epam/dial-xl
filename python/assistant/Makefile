PYTHON_EXEC ?= python3
DOCKER_EXEC ?= docker

IMAGE_NAME ?= ai-dial-xl
IMAGE_PLATFORM ?= linux/amd64

-include .env

.PHONY: init install update clean lint format mlflow

init:
	poetry env use ${PYTHON_EXEC}
	poetry config virtualenvs.in-project true --local
	poetry config installer.re-resolve false --local

install:
	poetry sync

update:
	poetry update

clean:
	poetry run python -m scripts.clean
	poetry env remove --all

lint: install
	poetry run ruff format --diff src tests --config pyproject.toml
	poetry run ruff check src tests --config pyproject.toml
	poetry run mypy src tests --config-file pyproject.toml

format: install
	poetry run ruff format src tests --config pyproject.toml
	poetry run ruff check --fix-only src tests --config pyproject.toml

mlflow: install
	poetry run mlflow server --host ${MLFLOW_HOST} --port ${MLFLOW_PORT} --backend-store-uri ${MLFLOW_BACKEND_URI} --default-artifact-root tracking/artifacts

run-server: install
	poetry run python -m run

run-e2e-integration: install
	poetry run pytest tests/e2e/scenarios/integration

run-e2e-business: install
	poetry run pytest tests/e2e/scenarios/business

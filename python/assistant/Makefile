POETRY_PYTHON ?= python3

PORT ?= 5000
IMAGE_NAME ?= ai-dial-qg
PLATFORM ?= linux/amd64
DOCKER ?= docker
ARGS=

-include .env

.PHONY: install serve clean graph docs publish lint mypy format test integration_tests business_tests docker_build docker_run

install:
	poetry env use ${POETRY_PYTHON}
	poetry install

serve: install
	poetry run uvicorn "quantgrid.app:app" --host "0.0.0.0" --port $(PORT) --env-file ./.env

clean:
	poetry run python -m scripts.clean
	poetry env remove --all

graph:
	poetry run pydeps ./quantgrid --cluster --keep-target-cluster --rmprefix quantgrid. --max-bacon 1 --reverse -o dependencies.svg

docs: install
	@echo "Building docs..."

lint: install
	poetry run nox -s lint

mypy: install
	poetry run mypy --config-file pyproject.toml -p parsing -p quantgrid -p testing

format: install
	poetry run nox -s format

integration_tests: install
	poetry run nox -s integration_tests

business_tests: install
	poetry run nox -s business_tests

# To run unit and integration tests:
#   make all_tests
# To list unit tests:
#   make all_tests TEST_PATH=tests/unit_tests/ ARGS=--collect-only
# To run tests from a particular module:
#   make all_tests TEST_PATH=tests/unit_tests/test_app.py
# To run tests from a particular test function:
#   make all_tests TEST_PATH=tests/unit_tests/test_app.py::test_average
# To print stderr/stdout of each test:
#   make all_tests ARGS="-v --durations=0 -rA"
# To run particular test by name:
#   make all_tests ARGS="-k 0_to_9"
all_tests: install
	poetry run pytest $(TEST_PATH) $(ARGS)

#docker_test:
#	$(DOCKER) build --platform $(PLATFORM) -f Dockerfile.test -t $(IMAGE_NAME):test .
#	$(DOCKER) run --platform $(PLATFORM) --rm $(IMAGE_NAME):test

docker_serve:
	$(DOCKER) build --platform $(PLATFORM) -t $(IMAGE_NAME):dev .
	$(DOCKER) run --platform $(PLATFORM) --env-file ./.env --rm -p $(PORT):5000 $(IMAGE_NAME):dev

help:
	@echo ====================
	@echo clean                        - clean virtual env and build artifacts
	@echo docs                         - build the documentation
	@echo -- LINTING --
	@echo format                       - run code formatters
	@echo lint                         - run linters
	@echo mypy						   - run mypy only
	@echo -- RUN --
	@echo serve                        - run the dev server locally
	@echo docker_serve                 - run the dev server from the docker
	@echo -- DEV --
	@echo graph						   - build internal dependency graph
	@echo -- TESTS --
	@echo integration_tests            - run integration tests
	@echo business_tests			   - run integration tests
	@echo all_tests                    - run all tests (allows to pass test files and extra arguments)

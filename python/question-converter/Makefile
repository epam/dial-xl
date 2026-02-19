SOURCE_DIRS = src tests

GRAMMAR_FILE = Sheet.g4
GRAMMAR_DIR = ../../backend/parser/src/main/antlr/com/epam/deltix/quantgrid/parser/
GRAMMAR_OUTPUT = src/dial/xl/converter/grammar/

-include .env

init:
	poetry config virtualenvs.in-project true --local
	poetry sync
	poetry run antlr4 -v 4.13.2 -Dlanguage=Python3 -o $(GRAMMAR_OUTPUT) -lib $(GRAMMAR_DIR) -Xexact-output-dir $(GRAMMAR_DIR)$(GRAMMAR_FILE)

sync:
	poetry sync

lint-check: sync
	poetry run -- ruff check $(SOURCE_DIRS) --config pyproject.toml
	poetry run -- dmypy run --export-types -- $(SOURCE_DIRS) --config-file pyproject.toml --cache-fine-grained

lint-fix: sync
	poetry run ruff check --fix-only $(SOURCE_DIRS)

format-check: sync
	poetry run ruff format --diff $(SOURCE_DIRS)

format-fix: sync
	poetry run ruff format $(SOURCE_DIRS)

test-all: sync
	poetry run pytest -vv

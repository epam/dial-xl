## How to build the project?

Make sure you have the following tools installed and available from CMD:

1. `poetry >= 2.0`: for dependencies management.
2. `make`: for project initialization and custom targets.
3. `java`: for `antlr4` python files generation.

Run `make init` in the project root directory CMD.

> Note: if working in PyCharm, point IDE to `.venv/Scripts/python` executable to set up python venv.

## How to use converter CLI?

1. Make sure you have project virtual environment activated.
2. To get CLI `--help`, run `xl-converter-cli --help`.
3. To avoid repeatedly specifying `--api-key`, `--model-name`, `--dial-url`, `--xl-url`, populate `.env` variables or
   environment variables.`.env.example` contains meaningful defaults.
4. To invoke question-to-test conversion, run `xl-converter-cli SOURCE_DIR DESTINATION_DIR`.
5. CLI collects `.json` files in `SOURCE_DIR`, attempts to load them as *Questions*, generate meaningful assertions and
   store assertions as tests in `DESTINATION_DIR`.
6. CLI **does not** overwrite already generated tests. It is safe to invoke CLI repeatedly.

## How to iterate on prompts?

1. Copy `.env.example` file as `.env` and populate listed `TEST_` variables.
2. All prompts are stored as `Jinja` templates in `src/dial/xl/converter/resources/templates` directory.
3. `tests/data` directory contains canonical answers / solutions examples. Its content may be retrieved in all tests
   using `shared_datadir` pytest fixture.
4. `tests/test_*.py` files contains corresponding functionality tests. You may refer to them as an example.
5. Use `make test-all` or run tests individually as you find convenient.

> Note: When launching tests from PyCharm UI, it is advised to set `autodetect` and `pytest` tests working directory
> to the root of this project. By default, PyCharm set `tests` directory as pytest workdir, which results in `.env` file
> missing. To do that: `Edit Configurations - Edit Configuration Templates - Python Tests - Autodetect / Pytest`.

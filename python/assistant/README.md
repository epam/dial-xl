# QuantGrid AI Chat Bot

This repository contains source code for QuantGrid AI Chat Bot based on the python-to-DSL and DSL-to-python translation.

## Local Development

### Pre-requisites

1. Install [Make](https://www.gnu.org/software/make/)
   * MacOS - should be already installed
   * [Windows](https://gnuwin32.sourceforge.net/packages/make.htm)
   * [Windows, using Chocolatey](https://community.chocolatey.org/packages/make)
   * Make sure that `make` is in the PATH (run `which make`).
2. Install Python 3.12
   * [MacOS, using Homebrew](https://formulae.brew.sh/formula/python@3.12) - `brew install python@3.12`
   * [Windows or MacOS, using official repository](https://www.python.org/downloads/)
   * [Windows, using Chocolatey](https://community.chocolatey.org/packages/python312)
   * Make sure that `python3.12` is in the PATH and works properly (run `python3.12 --version`).
3. Install [Poetry](https://python-poetry.org/docs/#installation)
   * MacOS - recommended way to install poetry is to [use pipx](https://python-poetry.org/docs/#installing-with-pipx)
   * Windows - recommended way to install poetry is to use [official installer](https://python-poetry.org/docs/#installing-with-the-official-installer)
   * Make sure that `poetry` is in the PATH and works properly (run `poetry --version`).

### Setup

1. Copy `.env.example` file as `.env` (`cp .env.example .env`).
2. Fill `POETRY_PYTHON` `.env` variable with python 3.12 executable name or path.
3. Create venv and install dependencies:
    ```bash
    make install
    ```
4. Open project in IDE and make sure that correct venv is used.
   * For PyCharm go to File → Settings → Project:qg → Python Interpreter
5. Fill `DIAL_API_KEY` and `QG_API_KEY` in `.env` (ask teammates for a key).
   
### Run

1. Use `run_local.py` to start QG locally. By default, it starts on port 5000, make sure it's free (run `netstat -a -o -n | grep 5000`). 
Application may not warn you. Run `http://localhost:5000/health` it must return `{"status": "ok"}`.
2. Run test to make sure it's working. For instance, you can run: [test_functions::test_text_function](testing/scenarios/integration_scenarios/test_functions.py).
It will run against your local setup, as `AGENT_DIAL_URL` in `.env` points to a localhost. Make sure that current directory is set to project root.


### Linter

1. To launch MyPy checks only:
    ```bash
    make mypy
    ```
2. To launch MyPy + code style checks:
    ```bash
    make lint
    ```
3. To launch autoformatting (`isort + autoflake + black`):
    ```bash
    make format
    ```

###  PyCharm Setup
#### Black Integration

Opened `.py / .pyi` file can be formatted according to Black rules via `CTRL + ALT + L`.
1. `CTRL + ALT + S` → Tools → Black -> On code reformat: set to `True`.

#### MyPy Integration

PyCharm supports both MyPy real time and on-demand analysis via [MyPy Plugin](https://plugins.jetbrains.com/plugin/11086-mypy).
1. Install Plugin
2. `CTRL + ALT + S` → MyPy → Path to config file: set to `pyproject.toml`.
3. Now, real time MyPy inspection will be enabled.
4. For on-demand project / module / file MyPy scanning: 
   ![Mypy Icon](readme/mypy_icon.png)

### Potential Setup Issues
1. Slow PyCharm debug: 
    - `CTRL + SHIFT + A` (Help → Find Action) → Registry
    - Turn off: `python.debug.low.impact.monitoring.api`
    - Turn off: `python.debug.use.single.port`
2. Issue with asyncio debug  PyCharm debug  `TypeError: _patch_task.<locals>.task_new_init() got an unexpected keyword argument 'eager_start'`:
    - `CTRL + SHIFT + A` (Help → Find Action) → Registry
    - Turn off: `python.debug.asyncio.repl`
3. Pytest fails with `Failed to locate sheet file`:
    - Go to `Run | Edit Configurations | Edit Configuration Templates...`
    - For each of `PythonTests:AutoDetect` and `PythonTests:PyTest` set working directory parameter to your project directory.
    - Delete all failing test run configurations

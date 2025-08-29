import nox

nox.options.reuse_existing_virtualenvs = True

MIN_PYTHON_VERSION = "3.12"
SRC = "."


def format_with_args(session: nox.Session, *args):
    session.run("autoflake", *args)
    session.run("isort", *args)
    session.run("black", *args)


@nox.session(python=[MIN_PYTHON_VERSION])
def lint(session: nox.Session):
    """Runs linters and fixers"""
    try:
        session.run("poetry", "install", external=True)
        session.run("poetry", "check", "--lock", external=True)
        session.run(
            "mypy",
            "--config-file",
            "pyproject.toml",
            "-p",
            "parsing",
            "-p",
            "quantgrid",
            "-p",
            "testing",
            "-p",
            "quantgrid_2a",
            "-p",
            "quantgrid_1",
            external=True,
        )
        session.run("flake8", SRC)
        format_with_args(session, SRC, "--check")
    except Exception:
        session.error(
            "Linting has failed. Run 'make format' to fix formatting and fix other errors manually"
        )


@nox.session(python=[MIN_PYTHON_VERSION])
def format(session: nox.Session):
    """Runs linters and fixers"""
    session.run("poetry", "install", external=True)
    format_with_args(session, SRC)


@nox.session(python=[MIN_PYTHON_VERSION])
def integration_tests(session: nox.Session):
    """Runs integration tests"""
    session.run("poetry", "install", external=True)
    session.run("pytest", "testing/scenarios/integration_scenarios")


@nox.session(python=[MIN_PYTHON_VERSION])
def business_tests(session: nox.Session):
    """Runs business tests"""
    session.run("poetry", "install", external=True)
    session.run("pytest", "testing/scenarios/business_scenarios")

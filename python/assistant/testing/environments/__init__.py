from testing.environments.all_actions_project import all_actions_project
from testing.environments.basic_project import basic_project
from testing.environments.casualties_project import casualties_project
from testing.environments.clients_project import clients_project
from testing.environments.countries_project import countries_project
from testing.environments.employees_project import employees_project
from testing.environments.empty_project import empty_project
from testing.environments.imdb_10_project import imdb_10_project
from testing.environments.imdb_project import imdb_project
from testing.environments.imdb_simple_project import imdb_simple_project
from testing.environments.miro_project import miro_project
from testing.environments.setup import setup_environment, setup_project

__all__ = [
    "setup_project",
    "setup_environment",
    "basic_project",
    "casualties_project",
    "countries_project",
    "employees_project",
    "empty_project",
    "imdb_project",
    "imdb_simple_project",
    "miro_project",
    "all_actions_project",
    "imdb_10_project",
    "clients_project",
]

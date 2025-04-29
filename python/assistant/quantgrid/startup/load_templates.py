import jinja2

from quantgrid.configuration import Env


def load_templates() -> jinja2.Environment:
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(Env.TEMPLATE_DIR),
        auto_reload=False,
        trim_blocks=True,
        lstrip_blocks=True,
        extensions=["jinja2.ext.do"],
    )

    return env

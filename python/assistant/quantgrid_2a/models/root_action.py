import pydantic

from quantgrid_2a.models.actions import AnyAction


class RootAction(pydantic.BaseModel):
    root: AnyAction = pydantic.Field(discriminator="type")

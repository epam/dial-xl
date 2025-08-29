import pydantic

from quantgrid.models.actions import AnyAction


class DiscriminatedAction(pydantic.BaseModel):
    root: AnyAction = pydantic.Field(discriminator="type")

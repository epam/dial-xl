from typing import List

from pydantic import BaseModel


class ApplicationState(BaseModel):
    actions_history: List[str] = []

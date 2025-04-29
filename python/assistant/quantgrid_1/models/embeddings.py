import json

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ScoreRecord(BaseModel):
    table: str
    field: str
    data: str
    score: float
    description: Optional[str] = None


class Embeddings(Dict[str, List[ScoreRecord]]):
    def __init__(self, embeddings_response: dict):
        embeddings: Dict[str, List[ScoreRecord]] = {}

        for result in embeddings_response["searchResults"]:
            field = f'{result["table"]}[{result["field"]}]'

            if field not in embeddings:
                embeddings[field] = []

            embeddings[field].append(ScoreRecord.model_construct(**result))

        dict.__init__(self, embeddings)

    def __str__(self):
        comprased_dict: Dict[str, List[Any]] = {}

        for field, records in self.items():
            comprased_dict[field] = [
                (
                    record.data
                    if record.description is None
                    else {
                        "data": record.data,
                        "description": record.description,
                    }
                )
                for record in records
                if "data" in record.model_fields_set
            ]

        return json.dumps(comprased_dict, indent=2)

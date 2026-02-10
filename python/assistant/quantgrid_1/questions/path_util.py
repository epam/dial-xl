import re

from quantgrid_1.questions.model import QuestionMetadata


def construct_question_folder(app_bucket: str, project_path: str) -> str:
    app_bucket = app_bucket.strip("/")
    project_path = project_path.strip("/")
    return f"files/{app_bucket}/{project_path}/questions"


def parse_question_file_name(file_name: str) -> QuestionMetadata | None:
    match = re.fullmatch(r"([^_]+)__([^_]+)__(.+).json", file_name)
    if match is None:
        return None

    return QuestionMetadata(
        question_file=file_name,
        status=match.group(1),
        reviewed=match.group(2),
        name=match.group(3),
    )

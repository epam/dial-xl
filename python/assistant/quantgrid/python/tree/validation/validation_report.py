import libcst.metadata as metadata
import pydantic


class ValidationError(pydantic.BaseModel):
    exception_name: str
    exception_message: str

    code_range: metadata.CodeRange


class ValidationReport(pydantic.BaseModel):
    function_code: str

    validation_errors: list[ValidationError]

    @staticmethod
    def from_error(code: str, error: ValidationError) -> "ValidationReport":
        return ValidationReport(function_code=code, validation_errors=[error])

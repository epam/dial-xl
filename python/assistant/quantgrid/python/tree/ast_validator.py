import libcst as cst

from quantgrid.python.tree.validation import (
    ValidationError,
    ValidationReport,
    Validator,
)


class ASTValidator:
    def __init__(self, validators: tuple[type[Validator], ...]):
        self._validators = [*validators]

    def validate(self, module: cst.Module) -> ValidationReport:
        errors: list[ValidationError] = []
        wrapper = cst.MetadataWrapper(module)

        for validator_type in self._validators:
            validator = validator_type()
            wrapper.visit(validator)

            errors.extend(validator.errors)

        return ValidationReport(function_code=module.code, validation_errors=errors)

    # TODO[Errors][Clean Code]: We definitely need to refactor this section to use regular python error mechanism.
    @staticmethod
    def format_report(report: ValidationReport) -> list[str]:
        return [
            ASTValidator._format_error(report.function_code, error)
            for error in report.validation_errors
        ]

    @staticmethod
    def _format_error(code: str, error: ValidationError) -> str:
        lines = code.splitlines()

        error_line_number = error.code_range.start.line
        error_column_start = error.code_range.start.column
        error_column_end = error.code_range.end.column

        # Calculate indices for the lines to display (previous, current, next)
        start_line_idx = max(error_line_number - 2, 0)  # Zero-based index
        end_line_idx = min(error_line_number + 1, len(lines))

        # Extract the relevant lines from the code
        code_snippet_lines = lines[start_line_idx:end_line_idx]

        # Prepare the formatted lines with line numbers
        snippet_lines = []
        for idx, line in enumerate(code_snippet_lines):
            # Actual line number in the code
            line_number = start_line_idx + idx + 1  # One-based index

            # Format the code line with the line number
            formatted_line = f"{line_number}:    {line}"
            snippet_lines.append(formatted_line)

            # If this is the error line, add the pointer line
            if line_number == error_line_number:
                # Calculate the position of the caret line
                # Account for the line number and colon when positioning the caret
                pointer_prefix_length = len(f"{line_number}:    ") + error_column_start
                # Ensure at least one caret is shown
                num_carets = max(1, error_column_end - error_column_start)
                # Create the pointer line with carets
                pointer_line = " " * pointer_prefix_length + "^" * num_carets
                snippet_lines.append(pointer_line)

        # Construct the error message
        snippet = "\n".join(snippet_lines)
        return f"{error.exception_name}: {error.exception_message}\n\n{snippet.strip('\r\n')}\n"

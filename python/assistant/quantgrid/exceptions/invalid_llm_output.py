from quantgrid.exceptions.xl_exception import XLException


class XLInvalidLLMOutput(XLException):
    def __init__(self, message: str | None = None):
        super().__init__(502, message)

from quantgrid.exceptions.xl_exception import XLException


class XLLLMUnavailable(XLException):
    def __init__(self, message: str | None = None):
        super().__init__(429, message)

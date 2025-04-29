from quantgrid.exceptions.xl_exception import XLException


class XLInternalError(XLException):
    def __init__(self, message: str | None = None):
        super().__init__(500, message)

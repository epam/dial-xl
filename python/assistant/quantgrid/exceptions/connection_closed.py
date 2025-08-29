from quantgrid.exceptions.xl_exception import XLException


class XLConnectionClosed(XLException):
    def __init__(self, message: str | None = None):
        super().__init__(499, message)

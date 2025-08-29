from quantgrid.exceptions.xl_exception import XLException


class XLUnsupportedMessage(XLException):
    def __init__(self, message: str | None = None):
        super().__init__(501, message)

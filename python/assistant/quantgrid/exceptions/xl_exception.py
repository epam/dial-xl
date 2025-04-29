class XLException(Exception):
    def __init__(self, code: int, message: str | None = None):
        super().__init__(message)
        self.code = code

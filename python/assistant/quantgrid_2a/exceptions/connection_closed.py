from quantgrid_2a.exceptions.qg_exception import QGException


class QGConnectionClosed(QGException):

    def __init__(self, message: str | None = None):
        super().__init__(499, message)

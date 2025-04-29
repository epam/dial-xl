from quantgrid_2a.exceptions.qg_exception import QGException


class QGLoadingException(QGException):

    def __init__(self, message: str | None = None):
        super().__init__(403, message)

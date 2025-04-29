import abc


class ErrorPredicate(abc.ABC):

    @abc.abstractmethod
    def check(self, message: str) -> bool:
        raise NotImplementedError

    @abc.abstractmethod
    def convert(self, message: str) -> str:
        raise NotImplementedError

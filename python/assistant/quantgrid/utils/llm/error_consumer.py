import abc

import openai


class ErrorConsumer(abc.ABC):
    @abc.abstractmethod
    def on_token_rate_limit(self, exception: openai.RateLimitError): ...

    @abc.abstractmethod
    def on_dial_rate_limit(self, exception: openai.BadRequestError): ...

    @abc.abstractmethod
    def on_dial_api_error(self, exception: openai.APIError): ...

    @abc.abstractmethod
    def on_error(self, exception: Exception): ...

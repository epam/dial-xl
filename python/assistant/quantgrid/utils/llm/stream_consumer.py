import abc

from langchain_core.messages import AIMessageChunk

from quantgrid.utils.llm.error_consumer import ErrorConsumer


class StreamConsumer(ErrorConsumer):
    @abc.abstractmethod
    def start_stream(self): ...

    @abc.abstractmethod
    def consume_stream(self, chunk: AIMessageChunk): ...

    @abc.abstractmethod
    def end_stream(self): ...

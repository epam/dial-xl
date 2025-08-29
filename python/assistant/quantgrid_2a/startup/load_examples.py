import typing

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.messages import BaseMessage

from quantgrid_2a.configuration import LOGGER
from quantgrid_2a.startup.helpers.example_loader import ExampleLoader


async def load_examples(path: str) -> typing.List[BaseMessage]:
    messages: typing.List[BaseMessage] = []
    for document in DirectoryLoader(
        path, glob="**/*.yaml", loader_cls=TextLoader
    ).load():
        LOGGER.info(f"Loading example-shot YAML: {document.metadata}")

        try:
            messages.extend(await ExampleLoader.load_example(document.page_content))
        except Exception as exception:
            LOGGER.error(f"Example-Shot YAML loading failed: {exception}")

    return messages

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.messages import BaseMessage

from quantgrid.configuration import LOGGER
from quantgrid.startup.misc.example_loader import ExampleLoader


async def load_examples(path: str) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for document in DirectoryLoader(
        path, glob="**/*.yaml", loader_cls=TextLoader
    ).load():
        LOGGER.info(f"Loading example-shot YAML: {document.metadata}")

        try:
            example = await ExampleLoader.load_example(document.page_content)
            if len(example):
                example[0].content = "[INTERACTION EXAMPLE BEGIN]\n\n" + str(example[0].content)  # type: ignore
                example[-1].content += "\n\n[/INTERACTION EXAMPLE END]\n"  # type: ignore

            messages.extend(example)
        except Exception as exception:
            LOGGER.error(f"Example-Shot YAML loading failed: {exception}")

    return messages

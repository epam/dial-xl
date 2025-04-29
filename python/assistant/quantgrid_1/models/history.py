from typing import List

from langchain_core.messages import BaseMessage, SystemMessage


class History:
    messages: List[BaseMessage]

    def __init__(self):
        self.messages = []

    def add_message(self, message: BaseMessage):
        self.messages.append(message)

    def change_prompt(self, new_prompt: SystemMessage):
        new_history = History()

        new_history.add_message(new_prompt)

        for message in self.messages:
            if isinstance(message, SystemMessage):
                continue

            new_history.add_message(message)

        return new_history

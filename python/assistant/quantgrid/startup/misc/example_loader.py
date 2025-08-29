import typing
import uuid

import yaml

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

from quantgrid.exceptions import XLInternalError


class ExampleLoader:
    @staticmethod
    async def load_example(yaml_content: str) -> typing.List[BaseMessage]:
        dictionary = yaml.safe_load(yaml_content)

        user_name = dictionary.get("user_name", "Example User")
        ai_name = dictionary.get("ai_name", "Example AI")

        assert "messages" in dictionary
        messages = dictionary["messages"]
        assert isinstance(messages, list)

        conversation: typing.List[BaseMessage] = []
        for message in messages:
            if "HumanMessage" in message:
                conversation.append(
                    ExampleLoader._form_human_message(
                        user_name, message["HumanMessage"]
                    )
                )
            elif "AIMessage" in message:
                conversation.append(
                    ExampleLoader._form_ai_message(ai_name, message["AIMessage"])
                )
            elif "ToolMessage" in message:
                ai_message = typing.cast(AIMessage, conversation[-1])
                conversation.append(
                    await ExampleLoader._form_tool_message(
                        ai_message, message["ToolMessage"]
                    )
                )
            else:
                raise XLInternalError(
                    f"Unexpected example message identifier {message}."
                )

        return conversation

    @staticmethod
    def _form_human_message(
        user_name: str, message: dict[str, typing.Any]
    ) -> HumanMessage:
        message["name"] = user_name
        return HumanMessage.model_validate(message)

    @staticmethod
    def _form_ai_message(ai_name: str, message: dict[str, typing.Any]) -> AIMessage:
        message["name"] = ai_name
        if "tool" in message:
            message["tool"]["args"] = (
                {} if "args" not in message["tool"] else message["tool"]["args"]
            )
            message["tool"]["id"] = str(uuid.uuid4().int)
            message["tool_calls"] = [message["tool"]]

        return AIMessage.model_validate(message)

    @staticmethod
    async def _form_tool_message(
        ai_message: AIMessage,
        message: dict[str, typing.Any],
    ) -> ToolMessage:
        assert (
            len(ai_message.tool_calls) == 1
        ), f"load_examples currently only supports one tool call: {ai_message}"

        if message and ("content" in message):
            message["tool_call_id"] = ai_message.tool_calls[0]["id"]
            return ToolMessage.model_validate(message)

        raise XLInternalError(
            "Dynamic Tool Execution is not supported at the moment. Specify full ToolMessage output."
        )

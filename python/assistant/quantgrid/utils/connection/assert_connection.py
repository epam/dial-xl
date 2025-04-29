import fastapi

from aidial_sdk.chat_completion import Choice

from quantgrid.exceptions import XLConnectionClosed


async def assert_connection(request: fastapi.Request, choice: Choice):
    if await request.is_disconnected() or choice.closed:
        raise XLConnectionClosed(
            "Client closed request before agent produced chat completion."
        )

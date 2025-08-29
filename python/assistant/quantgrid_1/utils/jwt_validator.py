import base64
import binascii
import json


def _decode_base64(base64_url_string):
    padding_needed = len(base64_url_string) % 4
    if padding_needed:
        base64_url_string += "=" * (4 - padding_needed)
    return base64.urlsafe_b64decode(base64_url_string)


def _is_valid_json(json_string):
    try:
        json.loads(json_string)
        return True
    except ValueError:
        return False


def is_valid_jwt(jwt_token):
    try:
        header, payload, _ = jwt_token.split(".")
        header_json = _decode_base64(header).decode("utf-8")
        payload_json = _decode_base64(payload).decode("utf-8")
        return _is_valid_json(header_json) and _is_valid_json(payload_json)
    except (
        ValueError,
        json.JSONDecodeError,
        UnicodeDecodeError,
        binascii.Error,
    ):
        return False

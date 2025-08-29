import sys
import time
import urllib.error
import urllib.request

from argparse import ArgumentParser

TIMEOUT = 30
INTERVAL = 1


def wait_for_startup(addr: str) -> int:
    timeout = TIMEOUT
    while timeout > 0:
        try:
            with urllib.request.urlopen(f"{addr}/health", timeout=INTERVAL) as response:
                if response.status == 200:
                    print("Health check OK.")
                    return 0
        except (urllib.error.URLError, ConnectionRefusedError):
            time.sleep(INTERVAL)
            timeout -= INTERVAL

    print("Server startup failed by timeout.")
    return 1


def main() -> int:
    parser = ArgumentParser(description="Wait for FastAPI server to become available")
    parser.add_argument(
        "--addr", default="localhost:5000", help="Server URL (default: localhost:5000)"
    )

    return wait_for_startup(parser.parse_args().addr)


if __name__ == "__main__":
    sys.exit(main())

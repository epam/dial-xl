# Prerequisites

1. `poetry >= 2.0`.
   1. Via `pipx`: https://python-poetry.org/docs/#installing-with-pipx
   2. Via official installer: https://python-poetry.org/docs/#installing-with-the-official-installer
2. `make`:
   1. For UNIX-based systems: https://www.gnu.org/software/make
   2. For Windows: https://gnuwin32.sourceforge.net/packages/make.htm
3. `protoc == 3.20.3` (protobuf compiler): https://github.com/protocolbuffers/protobuf/releases/tag/v3.20.3 

# Demo script

## Configure

In [demo.py](https://gitlab.deltixhub.com/Deltix/quantgrid/-/blob/main/python/xl-client/demo.py) configure QuantGrid URL, DIAL URL and API key/jwt:
```python
client = Client(
    "<quantgrid-url>",
    "<dial-core-url>",
    ApiKey("<api-key>"), # or Jwt("<jwt>")
)
```

## Run

```bash
make demo
```
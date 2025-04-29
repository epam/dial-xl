# Prerequisites

1. Poetry v1: https://python-poetry.org/docs/1.8/#installing-manually
2. Proto compiler v3: https://github.com/protocolbuffers/protobuf/releases/tag/v3.20.3
3. Make: https://www.gnu.org/software/make/

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
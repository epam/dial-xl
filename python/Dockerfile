FROM python:3.12-slim as builder

# Keeps Python from generating .pyc files in the container
# Turns off buffering for easier container logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y make && apt-get install -y protobuf-compiler # 22.5
RUN pip install poetry

WORKDIR /app

#RUN mkdir xl-client
COPY ./api.proto ./xl-client/
COPY ./xl-client ./xl-client/
RUN poetry -C ./xl-client install
RUN poetry run -C ./xl-client protoc --python_out=dial_xl/model api.proto

COPY ./assistant/pyproject.toml ./assistant/poetry.lock ./assistant/poetry.toml ./
RUN poetry install --no-interaction --no-ansi --no-cache --no-root --no-directory --only main

COPY ./assistant .
RUN poetry add ./xl-client --lock
RUN poetry install --no-interaction --no-ansi --no-cache --only main

FROM python:3.12-slim

WORKDIR /app

RUN adduser -u 1001 --disabled-password --gecos "" appuser
COPY --chown=appuser --from=builder /app .

COPY ./assistant/scripts/docker_entrypoint.sh /docker_entrypoint.sh
RUN chmod +x /docker_entrypoint.sh

ENV LOG_LEVEL=INFO
ENV WEB_CONCURRENCY=8

EXPOSE 5000

USER appuser
ENTRYPOINT ["/docker_entrypoint.sh"]

# During debugging, this entry point will be overridden. For more information, please refer to https://aka.ms/vscode-docker-python-debug
CMD ["python", "-O", "-m", "run_deploy"]
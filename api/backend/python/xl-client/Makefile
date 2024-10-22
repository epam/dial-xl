.PHONY: install proto demo test lint format build

install:
	poetry install

proto: install
	poetry run protoc --python_out=dial_xl/model --proto_path=../../../../backend/proto/src/main/proto api.proto

demo: proto
	poetry run python demo.py

test: proto
	poetry run nox -s test

lint: install
	poetry run nox -s lint

format: install
	poetry run nox -s format

build: install
	poetry build

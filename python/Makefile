.PHONY: install_client install_assistant install_all prepare_all build_client_package build_assistant_image

install_client:
	make -C xl-client install proto

install_assistant:
	make -C assistant install

install_all: install_client install_assistant

build_client_package:
	make -C xl-client build

build_assistant_image: build_client_package
	docker build --platform linux/amd64 -t ai-dial-qg:dev ./assistant --build-context assistant=./assistant --build-context client=./xl-client
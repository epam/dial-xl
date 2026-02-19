# Building `quantgrid/python` projects

Python projects depend on each other, so this README provides instructions to ensure correct setup of all projects.

## Prerequisites

1. `poetry >= 2.0`.
    1. Via `pipx`: https://python-poetry.org/docs/#installing-with-pipx
    2. Via official installer: https://python-poetry.org/docs/#installing-with-the-official-installer
2. `make`:
    1. For UNIX-based systems: https://www.gnu.org/software/make
    2. For Windows: https://gnuwin32.sourceforge.net/packages/make.htm
3. `protoc == 3.20.3` (protobuf compiler): https://github.com/protocolbuffers/protobuf/releases/tag/v3.20.3
4. `java >= 11` (JRE or JDK): https://www.oracle.com/java/technologies/downloads

Ensure that all tools are callable from terminal:

1. `poetry --version`
2. `make --version`
3. `protoc --version`
4. `java --version`

## Build

Run `make install_all` from current directory (`quantgrid/python`). This will build and install all projects in
`quantgrid/python`
folder. After that, you may proceed to working with project of interest:

1. `xl-client`: python API adapter for DIAL XL app. Imported by `assistant` and `question-converter`.
2. `assistant`: DIAL XL chat completion agent app. Imported by `question-converter`.
3. `question-converter`: CLI utility for question-to-test conversion.

> Note: when working with IDEs like PyCharm, it is advised to open the project of interest as project root, as every
> project creates its own virtual environment.

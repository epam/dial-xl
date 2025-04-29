import libcst as cst

from quantgrid.python.tree.conversion import Transformer


class ASTTransformer:
    def __init__(self, transformers: tuple[type[Transformer], ...]) -> None:
        self._transformers = [*transformers]

    def convert(self, module: cst.Module) -> cst.Module:
        config = module.config_for_parsing
        for transformer in self._transformers:
            module = cst.MetadataWrapper(module).visit(transformer(config))

        return module

import libcst as cst
import libcst.matchers as matcher


class Transformer(matcher.MatcherDecoratableTransformer):
    def __init__(self, config: cst.PartialParserConfig):
        super().__init__()
        self._config = config

    @property
    def config(self) -> cst.PartialParserConfig:
        return self._config

    def visit_Annotation(self, node: cst.Annotation) -> bool:
        return False

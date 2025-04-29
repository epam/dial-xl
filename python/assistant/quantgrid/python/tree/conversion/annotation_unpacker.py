import libcst as cst
import libcst.matchers as matcher

from quantgrid.python.tree.conversion.transformer import Transformer


class AnnotationUnpacker(Transformer):
    def visit_Annotation(self, node: cst.Annotation) -> bool:
        return True

    @matcher.call_if_inside(matcher.Annotation())
    @matcher.leave(matcher.SimpleString())
    def on_forwarded_annotation(
        self, _: cst.SimpleString, updated: cst.SimpleString
    ) -> cst.Name:
        return cst.Name(value=updated.raw_value)

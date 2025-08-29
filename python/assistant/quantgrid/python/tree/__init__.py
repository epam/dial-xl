from quantgrid.python.tree.ast_transformer import ASTTransformer
from quantgrid.python.tree.ast_validator import ASTValidator
from quantgrid.python.tree.conversion import *
from quantgrid.python.tree.validation import *

PYTHON_TRANSFORMER = ASTTransformer(
    (
        AnnotationUnpacker,
        DecoratorCleaner,
        LiteralTransformer,
        OperatorTransformer,
        ListTransformer,
        FunctionWrapperTransformer,
        ParenthesisTransformer,
        ReturnTransformer,
        IfTransformer,
        IfContextTransformer,
    )
)

PYTHON_VALIDATOR = ASTValidator(
    (
        BasicValidator,
        ConditionalDefValidator,
        # LambdaValidator,
        ScopeValidator,
    )
)

__all__ = ["ASTTransformer", "ASTValidator", "PYTHON_TRANSFORMER", "PYTHON_VALIDATOR"]

# Generated from Formula.g4 by ANTLR 4.13.2
from antlr4 import *
if "." in __name__:
    from .FormulaParser import FormulaParser
else:
    from FormulaParser import FormulaParser

# This class defines a complete generic visitor for a parse tree produced by FormulaParser.

class FormulaVisitor(ParseTreeVisitor):

    # Visit a parse tree produced by FormulaParser#formula.
    def visitFormula(self, ctx:FormulaParser.FormulaContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#number.
    def visitNumber(self, ctx:FormulaParser.NumberContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#string.
    def visitString(self, ctx:FormulaParser.StringContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#function_name.
    def visitFunction_name(self, ctx:FormulaParser.Function_nameContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#table_name.
    def visitTable_name(self, ctx:FormulaParser.Table_nameContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#field_name.
    def visitField_name(self, ctx:FormulaParser.Field_nameContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_add_sub.
    def visitBin_add_sub(self, ctx:FormulaParser.Bin_add_subContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_mul_div_mod.
    def visitBin_mul_div_mod(self, ctx:FormulaParser.Bin_mul_div_modContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_pow.
    def visitBin_pow(self, ctx:FormulaParser.Bin_powContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_and.
    def visitBin_and(self, ctx:FormulaParser.Bin_andContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_or.
    def visitBin_or(self, ctx:FormulaParser.Bin_orContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_compare.
    def visitBin_compare(self, ctx:FormulaParser.Bin_compareContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#bin_concat.
    def visitBin_concat(self, ctx:FormulaParser.Bin_concatContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#uni_op.
    def visitUni_op(self, ctx:FormulaParser.Uni_opContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#query_row.
    def visitQuery_row(self, ctx:FormulaParser.Query_rowContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#na_expression.
    def visitNa_expression(self, ctx:FormulaParser.Na_expressionContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprFieldReference.
    def visitExprFieldReference(self, ctx:FormulaParser.ExprFieldReferenceContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprDollar.
    def visitExprDollar(self, ctx:FormulaParser.ExprDollarContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprNa.
    def visitExprNa(self, ctx:FormulaParser.ExprNaContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprMulDivMod.
    def visitExprMulDivMod(self, ctx:FormulaParser.ExprMulDivModContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprTableName.
    def visitExprTableName(self, ctx:FormulaParser.ExprTableNameContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprAddSub.
    def visitExprAddSub(self, ctx:FormulaParser.ExprAddSubContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprUnaryOperator.
    def visitExprUnaryOperator(self, ctx:FormulaParser.ExprUnaryOperatorContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprNumber.
    def visitExprNumber(self, ctx:FormulaParser.ExprNumberContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprGenericFieldSlice.
    def visitExprGenericFieldSlice(self, ctx:FormulaParser.ExprGenericFieldSliceContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprCompare.
    def visitExprCompare(self, ctx:FormulaParser.ExprCompareContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprMemberFunction.
    def visitExprMemberFunction(self, ctx:FormulaParser.ExprMemberFunctionContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprOr.
    def visitExprOr(self, ctx:FormulaParser.ExprOrContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprTableFieldSlice.
    def visitExprTableFieldSlice(self, ctx:FormulaParser.ExprTableFieldSliceContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprConcat.
    def visitExprConcat(self, ctx:FormulaParser.ExprConcatContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprString.
    def visitExprString(self, ctx:FormulaParser.ExprStringContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprList.
    def visitExprList(self, ctx:FormulaParser.ExprListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprAnd.
    def visitExprAnd(self, ctx:FormulaParser.ExprAndContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprPow.
    def visitExprPow(self, ctx:FormulaParser.ExprPowContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprParenthesis.
    def visitExprParenthesis(self, ctx:FormulaParser.ExprParenthesisContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by FormulaParser#exprGlobalFunction.
    def visitExprGlobalFunction(self, ctx:FormulaParser.ExprGlobalFunctionContext):
        return self.visitChildren(ctx)



del FormulaParser
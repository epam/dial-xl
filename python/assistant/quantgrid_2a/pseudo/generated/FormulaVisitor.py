# Generated from Formula.g4 by ANTLR 4.13.2
from antlr4 import *

if "." in __name__:
    from .FormulaParser import FormulaParser
else:
    from FormulaParser import FormulaParser

# This class defines a complete generic visitor for a parse tree produced by FormulaParser.


class FormulaVisitor(ParseTreeVisitor):

    # Visit a parse tree produced by FormulaParser#number.
    def visitNumber(self, ctx: FormulaParser.NumberContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#string.
    def visitString(self, ctx: FormulaParser.StringContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#na.
    def visitNa(self, ctx: FormulaParser.NaContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#bin_add_sub.
    def visitBin_add_sub(self, ctx: FormulaParser.Bin_add_subContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#bin_mul_div_mod.
    def visitBin_mul_div_mod(self, ctx: FormulaParser.Bin_mul_div_modContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#bin_pow.
    def visitBin_pow(self, ctx: FormulaParser.Bin_powContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#bin_and.
    def visitBin_and(self, ctx: FormulaParser.Bin_andContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#bin_or.
    def visitBin_or(self, ctx: FormulaParser.Bin_orContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#bin_compare.
    def visitBin_compare(self, ctx: FormulaParser.Bin_compareContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#uni_op.
    def visitUni_op(self, ctx: FormulaParser.Uni_opContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#function_name.
    def visitFunction_name(self, ctx: FormulaParser.Function_nameContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#variable_name.
    def visitVariable_name(self, ctx: FormulaParser.Variable_nameContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#type.
    def visitType(self, ctx: FormulaParser.TypeContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#parameter.
    def visitParameter(self, ctx: FormulaParser.ParameterContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#input.
    def visitInput(self, ctx: FormulaParser.InputContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_indexing.
    def visitOn_indexing(self, ctx: FormulaParser.On_indexingContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_string.
    def visitOn_string(self, ctx: FormulaParser.On_stringContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_parentheses.
    def visitOn_parentheses(self, ctx: FormulaParser.On_parenthesesContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_member_function.
    def visitOn_member_function(self, ctx: FormulaParser.On_member_functionContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_list.
    def visitOn_list(self, ctx: FormulaParser.On_listContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_or.
    def visitOn_or(self, ctx: FormulaParser.On_orContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_mul_div_mod.
    def visitOn_mul_div_mod(self, ctx: FormulaParser.On_mul_div_modContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_compare.
    def visitOn_compare(self, ctx: FormulaParser.On_compareContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_and.
    def visitOn_and(self, ctx: FormulaParser.On_andContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_lambda.
    def visitOn_lambda(self, ctx: FormulaParser.On_lambdaContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_global_function.
    def visitOn_global_function(self, ctx: FormulaParser.On_global_functionContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_na.
    def visitOn_na(self, ctx: FormulaParser.On_naContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_pow.
    def visitOn_pow(self, ctx: FormulaParser.On_powContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_add_sub.
    def visitOn_add_sub(self, ctx: FormulaParser.On_add_subContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_variable.
    def visitOn_variable(self, ctx: FormulaParser.On_variableContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_number.
    def visitOn_number(self, ctx: FormulaParser.On_numberContext):
        return self.visitChildren(ctx)

    # Visit a parse tree produced by FormulaParser#on_unary.
    def visitOn_unary(self, ctx: FormulaParser.On_unaryContext):
        return self.visitChildren(ctx)


del FormulaParser

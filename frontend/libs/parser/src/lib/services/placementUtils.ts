import { ParserRuleContext } from 'antlr4';

import { FullDSLPlacement, ShortDSLPlacement } from '../parser';

export function getFullDSLPlacement(
  ctx: ParserRuleContext | undefined,
  withStopCalculation?: boolean
): FullDSLPlacement | undefined {
  if (!ctx || !ctx.stop) return;

  return {
    startOffset: ctx.start.start,
    stopOffset: ctx.stop?.stop || ctx.start.start + ctx.getText().length,
    startLine: ctx.start.line,
    stopLine: withStopCalculation
      ? ctx.start.line + ctx.getText().trimEnd().split('\n').length - 1
      : ctx.stop.line,
    startColumn: ctx.start.column,
  };
}

export function getMultiContextFullDSLPlacement(
  ctx: ParserRuleContext[]
): FullDSLPlacement | undefined {
  if (!ctx || ctx.length === 0) return;

  const firstCtx = ctx[0];
  const lastCtx = ctx[ctx.length - 1];

  const firstCtxPlacement = getFullDSLPlacement(firstCtx);
  const lastCtxPlacement = getFullDSLPlacement(lastCtx);

  if (!firstCtxPlacement || !lastCtxPlacement) return;

  return {
    startOffset: firstCtxPlacement.startOffset,
    stopOffset: lastCtxPlacement.stopOffset,
    startLine: firstCtxPlacement.startLine,
    stopLine: lastCtxPlacement.stopLine,
    startColumn: firstCtxPlacement.startColumn,
  };
}

export function getShortDSLPlacement(
  ctx: ParserRuleContext | undefined,
  stopIndexOffset = 0
): ShortDSLPlacement | undefined {
  if (!ctx) return;

  return {
    start: ctx.start.start,
    end: ctx.stop?.stop
      ? ctx.stop.stop + stopIndexOffset
      : ctx.start.start + ctx.getText().length,
  };
}

export function getFieldNameDslPlacement(
  ctx: ParserRuleContext | undefined,
  fieldName: string
): ShortDSLPlacement | undefined {
  if (!ctx) return;

  return {
    start: ctx.start.start,
    end: ctx.start.start + fieldName.length,
  };
}

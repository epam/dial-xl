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

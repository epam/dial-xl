import { TotalType } from '../parser';

type Ctx = { tableName: string; fieldName: string };

const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();

const simpleFuncPatterns = (FUNC: string) => (ctx: Ctx) =>
  [
    `${FUNC}(${ctx.tableName}[${ctx.fieldName}])`,
    `${ctx.tableName}[${ctx.fieldName}].${FUNC}()`,
  ];

const totalRules: Record<
  Exclude<TotalType, 'custom'>,
  (ctx: Ctx) => string[]
> = {
  sum: simpleFuncPatterns('SUM'),
  average: simpleFuncPatterns('AVERAGE'),
  count: simpleFuncPatterns('COUNT'),
  stdevs: simpleFuncPatterns('STDEVS'),
  median: simpleFuncPatterns('MEDIAN'),
  mode: simpleFuncPatterns('MODE'),
  max: simpleFuncPatterns('MAX'),
  min: simpleFuncPatterns('MIN'),
  countUnique: (ctx) => [`COUNT(UNIQUE(${ctx.tableName}[${ctx.fieldName}]))`],
};

export function getTotalType(
  tableName: string,
  fieldName: string,
  expression: string
): TotalType | undefined {
  if (!expression) return;

  const ctx: Ctx = { tableName, fieldName };
  const normalizedExpr = normalize(expression);

  for (const [type, makePatterns] of Object.entries(totalRules) as Array<
    [Exclude<TotalType, 'custom'>, (c: Ctx) => string[]]
  >) {
    const patterns = makePatterns(ctx).map(normalize);
    if (patterns.includes(normalizedExpr)) return type;
  }

  return 'custom';
}

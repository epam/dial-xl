import {
  ConstNumberExpression,
  ConstStringExpression,
  Expression,
  findFunctionExpressions,
  FunctionExpression,
  ParsedField,
  ParsedSheets,
} from '@frontend/parser';

export type ImportArgs = {
  source: string;
  dataset: string;
  version: number;
};

const isConstString = (e: Expression): e is ConstStringExpression =>
  e instanceof ConstStringExpression;

const isConstNumber = (e: Expression): e is ConstNumberExpression =>
  e instanceof ConstNumberExpression;

function extractImportArgs(
  fn: FunctionExpression
): { source: string; dataset: string; version: number } | null {
  if (fn.name !== 'IMPORT' || fn.arguments.length !== 1) return null;

  const tuple = fn.arguments[0] as Expression[] | undefined;
  if (!Array.isArray(tuple) || tuple.length !== 2) return null;

  const [datasetExpr, versionExpr] = tuple;
  if (!isConstString(datasetExpr) || !isConstNumber(versionExpr)) return null;

  const raw = datasetExpr.text?.trim() ?? '';
  const version = Number.parseInt(versionExpr.text, 10);
  if (!raw || !Number.isFinite(version)) return null;

  const parts = splitSourceDataset(raw);
  if (!parts) return null;

  return { ...parts, version };
}

function setMaxImport(
  map: Map<string, ImportArgs>,
  source: string,
  dataset: string,
  version: number
) {
  const key = `${source}/${dataset}`;
  const prev = map.get(key);
  if (!prev || version > prev.version) {
    map.set(key, { source, dataset, version });
  }
}

function splitSourceDataset(
  input: string
): { source: string; dataset: string } | null {
  const sep = input.indexOf('/');
  if (sep <= 0 || sep >= input.length - 1) return null;

  return {
    source: input.slice(0, sep),
    dataset: input.slice(sep + 1),
  };
}

export function collectUsedImports(
  parsedSheets: ParsedSheets
): Map<string, ImportArgs> {
  const used = new Map<string, ImportArgs>();

  for (const sheet of Object.values(parsedSheets)) {
    for (const table of sheet.tables) {
      for (const field of table.fields) {
        const expr = field.expression;
        if (!expr) continue;

        for (const fn of findFunctionExpressions(expr)) {
          const args = extractImportArgs(fn);
          if (!args) continue;
          setMaxImport(used, args.source, args.dataset, args.version);
        }
      }
    }
  }

  return used;
}

export function collectSingleFieldImport(
  parsedField: ParsedField
): ImportArgs | null {
  const expr = parsedField.expression;

  if (!expr) return null;

  const functionExpressions = findFunctionExpressions(expr);
  for (const fn of functionExpressions) {
    const args = extractImportArgs(fn);
    if (args) {
      return args;
    }
  }

  return null;
}

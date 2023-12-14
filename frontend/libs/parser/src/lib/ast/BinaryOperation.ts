export enum BinaryOperation {
  ADD = '+',
  SUB = '-',
  MUL = '*',
  DIV = '/',
  POW = '^',
  LT = '<',
  GT = '>',
  LTE = '<=',
  GTE = '>=',
  NEQ = '<>',
  EQ = '=',
  AND = 'AND',
  OR = 'OR',
  MOD = 'MOD',
}

export function parseBinaryOperation(s: string): BinaryOperation {
  switch (s) {
    case '+': {
      return BinaryOperation.ADD;
    }
    case '-': {
      return BinaryOperation.SUB;
    }
    case '*': {
      return BinaryOperation.MUL;
    }
    case '/': {
      return BinaryOperation.DIV;
    }
    case '^': {
      return BinaryOperation.POW;
    }
    case '<': {
      return BinaryOperation.LT;
    }
    case '>': {
      return BinaryOperation.GT;
    }
    case '<=': {
      return BinaryOperation.LTE;
    }
    case '>=': {
      return BinaryOperation.GTE;
    }
    case '<>': {
      return BinaryOperation.NEQ;
    }
    case '=': {
      return BinaryOperation.EQ;
    }
    case 'AND': {
      return BinaryOperation.AND;
    }
    case 'OR': {
      return BinaryOperation.OR;
    }
    case 'MOD': {
      return BinaryOperation.MOD;
    }
    default: {
      throw new Error('IllegalStateException');
    }
  }
}

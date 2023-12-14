export enum UnaryOperation {
  ABS = 'ABS',
  NEG = '-',
  NOT = 'NOT',
  IS_NA = 'IS_NA',
}

export function parseUnaryOperation(s: string) {
  switch (s) {
    case 'ABS': {
      return UnaryOperation.ABS;
    }
    case '-': {
      return UnaryOperation.NEG;
    }
    case 'NOT': {
      return UnaryOperation.NOT;
    }
    case 'ISNA': {
      return UnaryOperation.IS_NA;
    }
    default:
      throw new Error('IllegalStateException');
  }
}

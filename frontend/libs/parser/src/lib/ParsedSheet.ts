import { ParsedTable } from './ParsedTable';

export class ParsedSheet {
  constructor(public tables: ParsedTable[], public errors: string[]) {}
}

import { ParsedTable } from './ParsedTable';
import { PythonBlock } from './PythonBlock';

export class ParsedSheet {
  constructor(
    public tables: ParsedTable[],
    public errors: string[],
    public pythonBlocks: PythonBlock[]
  ) {}
}

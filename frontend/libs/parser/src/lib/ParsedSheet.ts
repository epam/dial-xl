import { createEditableSheet } from './EditDslApi';
import { Sheet } from './EditDslApi/Sheet';
import { ParsedTable } from './ParsedTable';
import { PythonBlock } from './PythonBlock';

export class ParsedSheet {
  private readonly _editableSheet: Sheet | null;

  constructor(
    public tables: ParsedTable[],
    public errors: string[],
    public pythonBlocks: PythonBlock[],
    private dsl: string,
    sheetName = 'Sheet1'
  ) {
    try {
      this._editableSheet = createEditableSheet(sheetName, dsl, tables);
    } catch (e) {
      this._editableSheet = null;
    }
  }

  public get editableSheet(): Sheet | null {
    return this._editableSheet;
  }

  public clone(): ParsedSheet {
    return new ParsedSheet(
      [...this.tables],
      this.errors,
      this.pythonBlocks,
      this.dsl
    );
  }
}

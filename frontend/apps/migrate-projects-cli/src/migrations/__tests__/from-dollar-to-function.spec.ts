import { updateSheetContent } from '../from-dollar-sign-to-function';

describe('updateSheetContent', () => {
  describe('UNIQUE - function with table as context and single argument', () => {
    it('function with table as first argument', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = UNIQUEBY(Table1, $[Field1])
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = UNIQUEBY(Table1, Table1[Field1])
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
    it('as function of table', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = Table1.UNIQUEBY($[Field1])
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = Table1.UNIQUEBY(Table1[Field1])
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
    it('as function of table inside another function', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = COUNT(Table1.UNIQUEBY($[Field1]))
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = COUNT(Table1.UNIQUEBY(Table1[Field1]))
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
    it('as function of function expression', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code].UNIQUEBY($)
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code].UNIQUEBY(Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code])
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
    it('as function with function expression as first argument', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = UNIQUEBY(Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code], $)
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = UNIQUEBY(Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code], Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code])
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
    it('as function with function expression as first argument with $ inside it', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = UNIQUEBY(Data.FILTER($[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code], $)
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = UNIQUEBY(Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code], Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code])
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
    it('as function of function expression with $ inside of function expression', () => {
      const input = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = Data.FILTER($[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code].UNIQUEBY($)
      `;
      const expected = `
        table Table1
          [Field1] = 1

        table Table2
          [p] = Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code].UNIQUEBY(Data.FILTER(Data[Subcategory_Mapped] = "BEVERAGE")[Fiscal Qtr Code])
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
  });
  describe('PIVOT', () => {
    it('should ignore all arguments processing', () => {
      const input = `
        table Table1
          [Field1] = 1
          [Field2] = 1

        table Table2
          [p] = PIVOT(Table1, $[Field1], SUM($[Field2]))
      `;
      const expected = `
        table Table1
          [Field1] = 1
          [Field2] = 1

        table Table2
          [p] = PIVOT(Table1, $[Field1], SUM($[Field2]))
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
  });
  describe('UNPIVOT', () => {
    it('should ignore all arguments processing', () => {
      const input = `
        table Table1
          [Field1] = 1
          [Field2] = 1

        table Table2
          [p] = UNPIVOT(Data.FILTER($[Subcategory_Mapped] = "BEVERAGE"), SUM($[Field2]), "field2", SUM($[Field2]))
      `;
      const expected = `
        table Table1
          [Field1] = 1
          [Field2] = 1

        table Table2
          [p] = UNPIVOT(Data.FILTER($[Subcategory_Mapped] = "BEVERAGE"), SUM($[Field2]), "field2", SUM($[Field2]))
      `;

      expect(updateSheetContent(input)).toBe(expected);
    });
  });
});

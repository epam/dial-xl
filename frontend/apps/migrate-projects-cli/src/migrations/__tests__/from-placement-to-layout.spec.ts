import { fromPlacementToLayoutDecorator } from '../from-placement-to-layout';

describe('modifyContent', () => {
  it('should replace !placement with !layout including title and headers', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2)
  table 1
`;
    const expectedYAML = `sheet1: |
  !layout(1, 2, "title", "headers")
  table 1
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should replace !placement with !layout excluding headers when !hideFields() is present', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2)
  !hideFields()
  table 1
`;
    const expectedYAML = `sheet1: |
  !layout(1, 2, "title")
  table 1
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should replace !placement with !layout excluding title when !hideHeader() is present', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2)
  !hideHeader()
  table 1
`;
    const expectedYAML = `sheet1: |
  !layout(1, 2, "headers")
  table 1
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should replace !placement with !layout excluding both title and headers when both !hideFields() and !hideHeader() are present', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2)
  !hideFields()
  !hideHeader()
  table 1
`;
    const expectedYAML = `sheet1: |
  !layout(1, 2)
  table 1
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should handle multiple tables with different configurations', () => {
    const inputYAML = `sheet1: |
  !placement(3, 2)
  table 1
sheet2: |
  !hideFields()
  !placement(3, 2)
  table 2
sheet3: |
  !hideHeader()
  !placement(3, 2)
  table 3
sheet4: |
  !placement(3, 2)
  !hideFields()
  !hideHeader()
  table 4
`;
    const expectedYAML = `sheet1: |
  !layout(3, 2, "title", "headers")
  table 1
sheet2: |
  !layout(3, 2, "title")
  table 2
sheet3: |
  !layout(3, 2, "headers")
  table 3
sheet4: |
  !layout(3, 2)
  table 4
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should handle decorators in different orders', () => {
    const inputYAML = `sheet1: |
  !hideFields()
  !placement(1, 2)
  table 1
sheet2: |
  !hideHeader()
  !placement(1, 2)
  table 2
sheet3: |
  !hideHeader()
  !hideFields()
  !placement(1, 2)
  table 3
sheet4: |
  !placement(1, 2)
  !hideHeader()
  table 4
`;
    const expectedYAML = `sheet1: |
  !layout(1, 2, "title")
  table 1
sheet2: |
  !layout(1, 2, "headers")
  table 2
sheet3: |
  !layout(1, 2)
  table 3
sheet4: |
  !layout(1, 2, "headers")
  table 4
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should handle a single table with mixed order and overlapping decorators', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2)
  !hideHeader()
  !hideFields()
  table 1`;
    const expectedYAML = `sheet1: |
  !layout(1, 2)
  table 1
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should handle a multiple tables with mixed order and overlapping decorators', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2) !hideHeader()
  !hideFields() table 1
  !placement(1, 2)
  !hideFields()
  table 2`;
    const expectedYAML = `sheet1: |
  !layout(1, 2) table 1
  !layout(1, 2, "title")
  table 2
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should handle a multiple tables with mixed order and overlapping decorators and manual decorator', () => {
    const inputYAML = `sheet1: |
  !placement(1, 2) !manual() !hideHeader()
  !hideFields() table 1
  !placement(1, 2)
  !hideFields()
  table 2`;
    const expectedYAML = `sheet1: |
  !layout(1, 2) !manual() table 1
  !layout(1, 2, "title")
  table 2
`;

    expect(fromPlacementToLayoutDecorator(inputYAML)).toBe(expectedYAML);
  });

  it('should handle a real sheet', () => {
    const inputYAML = `sheet1: |
  !placement(2, 7)
  table Table2
    dim [source] = INPUT("files/fff/appdata/xl/cities2/cities.csv")
    [city] = [source][city]
    [country] = [source][country]
    key [population] = [source][population]
    [area] = [source][area]
    [description] = [source][description]
  apply
  filter [country] = "Russia"
  override
  row,[area],[description]
  1,2,1
  2,3,2
  3,5,3




  !placement(73, 40)
  table Table1
    key dim [source] = RANGE(10)
    !format("text") [Field1] = 11122333
    !format("date", "LL d, yyyy") [SampleField] = NA
  total
  [SampleField] = COUNT(Table1[SampleField])
  override
  [SampleField],key [source]
  "₿","6"
  "€","8"

  !placement(1,1)
  !manual()
  table SimpleTable
    [RowNumber] = 1
    [NewColumnnn] = 123
  override
  [RowNumber],[NewColumnnn]
  "1",9
  "2",8
  "3",7
  "4",6
  "5",5
  "6",4
  "7",3
  "8",4
  "9",2
  ,1
  ,0
  ,0
`;
    const expectedYAML = `sheet1: |
  !layout(2, 7, "title", "headers")
  table Table2
    dim [source] = INPUT("files/fff/appdata/xl/cities2/cities.csv")
    [city] = [source][city]
    [country] = [source][country]
    key [population] = [source][population]
    [area] = [source][area]
    [description] = [source][description]
  apply
  filter [country] = "Russia"
  override
  row,[area],[description]
  1,2,1
  2,3,2
  3,5,3




  !layout(73, 40, "title", "headers")
  table Table1
    key dim [source] = RANGE(10)
    !format("text") [Field1] = 11122333
    !format("date", "LL d, yyyy") [SampleField] = NA
  total
  [SampleField] = COUNT(Table1[SampleField])
  override
  [SampleField],key [source]
  "₿","6"
  "€","8"

  !layout(1, 1, "title", "headers")
  !manual()
  table SimpleTable
    [RowNumber] = 1
    [NewColumnnn] = 123
  override
  [RowNumber],[NewColumnnn]
  "1",9
  "2",8
  "3",7
  "4",6
  "5",5
  "6",4
  "7",3
  "8",4
  "9",2
  ,1
  ,0
  ,0
`;

    const result = fromPlacementToLayoutDecorator(inputYAML);

    expect(result).toBe(expectedYAML);
  });
});

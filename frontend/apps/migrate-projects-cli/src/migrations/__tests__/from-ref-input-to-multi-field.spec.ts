import { fromInputReferenceToMultiFieldGroup } from '../from-input-reference-to-multi-field-group';

describe('from-input-reference-to-multi-field-group', () => {
  it('migrates a simple INPUT reference', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [name] = [source][name]
  [Location] = [source][Location]
  [ID] = [source][ID]
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
    dim [name], [Location], [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('migrates INPUT and preserves key & decorators', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  !size(2)
  !index()
  !random_user_decorator("string value")
  key [name] = [source][name]
  [Location] = [source][Location]
  [ID] = [source][ID]
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
    !size(2)
    !index()
    !random_user_decorator("string value")
    dim key [name], [Location], [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('migrates INPUT and preserves keys, decorators, and notes', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  ## This is a note 1
  ## Another note 1
  !size(2)
  !index()
  !random_user_decorator("string value")
  key [name] = [source][name]
  ## This is a note 2
  ## Another note 2
  [Location] = [source][Location]
  [ID] = [source][ID]
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
    ## This is a note 1
    ## Another note 1
    !size(2)
    !index()
    !random_user_decorator("string value")
    dim key [name], ## This is a note 2
    ## Another note 2
    [Location], [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('migrates INPUT when display names differ from accessor names', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [custom name] = [source][name]
  [custom location] = [source][Location]
  [custom id] = [source][ID]
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
    dim [custom name], [custom location], [custom id] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('migrates only the target table, leaving the others unchanged', () => {
    const inputYAML = `sheet1: |
  !layout(9, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [name] = [source][name]
  [Location] = [source][Location]
  [ID] = [source][ID]

  !layout(1, 1, "title", "headers")
  table Table2
  dim [source] = RANGE(10);
  [a] = [source] ^ 2

  !layout(4, 4, "title", "headers")
  table Table3
  dim [source] = RANGE(3);
  [b] = [source] ^ 3
`;
    const expectedYAML = `sheet1: |
  !layout(9, 9, "title", "headers")
  table Table1
    dim [name], [Location], [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]

  !layout(1, 1, "title", "headers")
  table Table2
  dim [source] = RANGE(10);
  [a] = [source] ^ 2

  !layout(4, 4, "title", "headers")
  table Table3
  dim [source] = RANGE(3);
  [b] = [source] ^ 3
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('skips migration when fields reference a different source field', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [name] = [source1][name]
  [Location] = [source1][Location]
  [ID] = [source1][ID]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(inputYAML);
  });

  it('migrates INPUT with a single referenced field', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [name] = [source][name]
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
    dim [name] = INPUT("files/abc1/appdata/xl/project/departments.csv")[name]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('skips migration when INPUT already contains an accessor list', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  !layout(4, 9, "title", "headers")
  table Table1
    dim [name] = INPUT("files/abc1/appdata/xl/project/departments.csv")[name]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(inputYAML);
  });

  it('retains the original field order after migration', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  [simple field] = 1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [name] = [source][name]
  [Location] = [source][Location]
  [ID] = [source][ID]
  [another field] = 2 + 2
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  [simple field] = 1
    dim [name], [Location], [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
  [another field] = 2 + 2
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('migrates table with escaped name', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table 'complex table_name 11'
  [simple field] = 1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  [name and spaces] = [source][name]
  [Location] = [source][Location]
  [ID] = [source][ID]
  [another field] = 2 + 2
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table 'complex table_name 11'
  [simple field] = 1
    dim [name and spaces], [Location], [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
  [another field] = 2 + 2
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });

  it('migrates INPUT and preserves decorator different argument types', () => {
    const inputYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
  dim [source] = INPUT("files/abc1/appdata/xl/project/departments.csv")
  !size(2)
  !format("number", 1, 0)
  [name] = [source][name]
  !another_decorator("string value")
  !empty_decorator()
  !multi_string_decorator("str1", "str2", "str3")
  [Location] = [source][Location]
  !format("currency", 1, 0, "$")
  [ID] = [source][ID]
`;
    const expectedYAML = `sheet1: |
  !layout(4, 9, "title", "headers")
  table Table1
    !size(2)
    !format("number",1,0)
    dim [name], !another_decorator("string value")
    !empty_decorator()
    !multi_string_decorator("str1","str2","str3")
    [Location], !format("currency",1,0,"$")
    [ID] = INPUT("files/abc1/appdata/xl/project/departments.csv")[[name], [Location], [ID]]
`;

    expect(fromInputReferenceToMultiFieldGroup(inputYAML)).toBe(expectedYAML);
  });
});

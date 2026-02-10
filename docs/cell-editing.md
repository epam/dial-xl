# Start from empty cell

![image](./img/cell-editing/cell-editing.drawio.svg)


| State  | DSL  | Visual |
|--------|------|--------|
| single number cell  | <pre>!hideHeader() <br/>!hideFields() <br/>table Table1<br/> [Field1] = 42</pre>  | ![image](./img/cell-editing/42.png)  |
| single text cell  | <pre>!hideHeader() <br/>!hideFields() <br/>table Table1<br/> [Field1] = "text"</pre>  | ![image](./img/cell-editing/text.png)  |
| single formula cell  | <pre>!hideHeader() <br/>!hideFields() <br/>table Table1<br/> [Field1] = COUNT(Table2)</pre>  | ![image](./img/cell-editing/formula.png)  |
| manual table (two rows)  | <pre>!manual()<br/>!hideHeader() <br/>!hideFields() <br/>table Table1<br/>  [Field1]<br/>override<br/>[Field1]<br/>42<br/>43  | ![image](./img/cell-editing/manual-two-rows.png)  |
| manual table (two fields)  | <pre>!manual()<br/>!hideHeader() <br/>!hideFields() <br/>table Table1<br/> [Field1]<br/> [Field2]<br/>override<br/>[Field1],[Field2]<br/>42,43</pre>  | ![image](./img/cell-editing/manual-two-fields.png)  |
| auto vertical table  | <pre>table Table1<br/> dim [source] = Table2<br/> key [name] = [source][name]<br/> [gdp] = [source][gdp]</pre> | ![image](./img/cell-editing/auto-vertical.png)  |
| auto horizontal table  | <pre>!horizontal()<br/> table Table1<br/> [source] = Table2("USA") <br/> key [name] = [source][name]<br/> [gdp] = [source][gdp]</pre> | ![image](./img/cell-editing/auto-horizontal.png)  |


**Note 1:** We treat these single cell tables differently in code (as "not yet undecided"). The single cell table is a table with:
- Hidden headers
- Single field
- Not manual
- No overrides

**Note 2:** We distinguish between `single number/text cell` (where formula is number or string literal) and `single  formula` (where formula is not literal). When user open cell editor on `number/text` we show editor WITHOUT equal sign `=`. For formula we open cell editor WITH equal sign.  
**Note 3:** As always if user enters the formula with `=` we consider it as a text, not formula  
**Note 4:** If user changes formual for a single-cell to formula that results in a complex type (nested or table), we recreate table according to autosource rules.   
**Note 5:** We modify the autosource rule slightly for formulas resulting in row reference (non-nested table). As these tables are always on row, it makes sense to create them as horizontal.   
**Note 6:** If user manually enters a second cell either below or to the right, we assume user decided that table is going to be manual.  
**Note 7:** Still user may decide to delete everything back to just one cell. Once the last element is removed (from grid UI), we go back to special undecided state.   
**Note 8:** In a special state we may not destinguish between cell modes, show no hints, and DO show copilot suggestions.  

# Requirements for integration tests

## High-level purpose

Make sure that full triad: 
- DIAL Backend, 
- QG Backend
- QG Bot
is well integrated and works together well, has no misalignment in protocols, APIs and DSL.

The big part is that Bot actually knows the basics subset of the DSL and for basic question produces code that QG Backend can compile and execute to get expected result. 

## Requirements

1. (Deterministic and simple) Integration tests should be simple enough so any stable and reasonable implementation can hit 100 of 100. We should avoid compound tests or tests that require complex input understanding, specific domain knowledge or complex coding. Every prompt must be articulated in a perfectly clean English with only one reasonable interpretation. We should not hesitate to make a few iterations to make test prompts easier to understand, but should avvoid tunning prompts for particular implementation.
2. Tests should be agnostic to implementation details of Bot, DSL and QG backend itself. 
    - Must not mention desired DSL functions by name (use phrases like "specialized function for this matter") 
    - Must avoid using any terminology that correspond to particular implementation's prompt details, unless this terminology used by QG client-facing application itself. (example: we may ask for adding "comment" or "note", but not "annotation" as there is no such term on UI)
    - Validation procedure must not rely on order and types of actions unless prompt contains specific instructions. All action sequences that solves the task should be accepted (unless prompt contains specific instructions).
    - Validation should be flexible in terms of results formats. (Example: we should accept results like: 2020, 2020.0, 2,020.0 etc). 
    - Validation should be flexible in terms of results layout unless strict layout requirement is part of the prompt. (Example: if it's easier to solve task by adding field to existing table or new table we should accept both)
3. We should make sure that  integration of all basic features is not broken. There must be at least one test that utilizes every feature below.
    - Bot can receive DSL from the project according to protocol
    - Bot can parse/compile DSL using QG SDK 
    - Bot can generate valid DSL (that we parse, compile and execute without errors)
    - Bot can get DSL executed and get results...
    - Bot can utilize chat history
    - Bot can use AI hints
    - Bot can see some part of the table data to correctly form conditions like "what revenue is linear", where linear is category stored as table field. Taxonomy includes few unique category values.
    - Bot can get semantically related table data for query like "give me GDP for 2020", where "GDP" is the value of indicator field, which contains thousands of different values.
    - Bot can handle all 4 basic types of question (particular implementation may use different taxonomy or none at all as long as it can meet high level need):
        - General question
        - Product help
        - Explanation of current project
        - Code generation request with two sub types:
            - Perform change in code: usually does not include data in natural language response
            - Request for particular data (sum, top10): includes data in natural language response.
    - Bot can do following logical actions (which might be classified differently by various implementations):
        - Add/Remove/Change Field. "Change" means rename or formula change.
        - Add/Remove/Change Table/Field comment
        - Add/Remove/Change decorator
        - Add/Remove/Change Table. "Change" means Add/Remove/Change multiple fields/decorators/comments at once along with table name
        - Add/Remove/Change Manual Table. The difference is that Manual table contains data inside (Example: create me a table of top10 IMDB movies)
4. Bot and Grid are aligned on DSL basics. Bot can use minimum viable subset of DSL to get expected results for a simple queries:
    - "+","-","/","*","&"
    - AND/OR
    - <, >, <=, >=, =, <>
    - ROUND, ABS
    - IF, IFNA
    - VALUE, TEXT
    - SUBSTIUTE, LEFT, RIGHT, CONTAINS
    - COUNT, AVERAGE, SUM, MIN, MAX
    - DATE, YEAR, MONTH, DAY
    - FILTER # simple create new FILTER, not a join
    - FIRST() # one argument version. 
    - UNIQUE, SORTBY
    - Single dim tables.
    - Out of scope
        - No INPUT # data expected to be added into the project manually
        - No fields that result in lists or table references (except may be SORTBY)
        - No 2+ dims # Seems like this is too advanced
        - No PIVOT, UNPIVOT
        - No Apply block
        - No Charting
        - No FIND and INDEX
        - No UNION, INTERSECT, IN
        - No PERIOD SERIES
5. Test set should include corner case scenarios. Fix for every engineering failure on integration part should come with the test. For example: 
    - Empty sheet
    - Multiple sheets
    - Invalid project DSL
    - Inclusion of Python inline codes and other features unsupported by Bot  

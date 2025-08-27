# MVP Requirements 

Bot is the DIAL application that transforms user request into natural language response (that may contain numerical data) and code that can be executed to solve user request.

## Functional requirements
1. Support of all basic features (pass [integration tests](integration_tests.md) for basic features, see section 3)
2. Bot must solve simple questions (with reasonable success rate around 80%, see appendix):
    - ? Ilya's Projects-Employees-Assignments
3. Bot must know how to use MVP subset of DSL (pass [integration tests](integration_tests.md) for DSL knowledge, see section 4)
4. Bot should respect the notes left by the user (they often describe project, tables and fields).
5. Bot should be able to follow user's recommendation on how to solve the problem from both prompt and AI Hint. That may include functions, decorators (in natural language) or DSL Bot doesn't know. For example:
    - apply block?
    - visualization decorators?
    - manual tables/formula overrides
    - PIVOT/UNPIVOT
6. Bot must be able to see the data to build relevant filter conditions
7. Bot must be able to get feedback from a compiler and correct itself. 
8. Bot should not have basic corner cases handled gracefully. (pass [integration tests](integration_tests.md) for corner cases and engineering failures, see section 5)
9. Bot should be able to not change parts of the projects which should not be changed (example: when asked to change comment formula rewrite is completely unexpected) 

## Non functional requirements
1. Execution time for simple queries: 60sec.

### Ilya's Projects-Employees-Assignments 
1. Provide me top-3 busiest members for the project.
2. What project Jason is working on?
3. Please add another column to Employee table. Call it Most Expensive Project. Please populate it accordingly.
4. Add a column that will contain full name of employee to Employees table.
5. Add a column to Assignments table with a cost of an assignment.
6. How many employees are in the company?
7. How many of the employees have Lead (=4) title?
8. How many employees have experience between 3-7 years?
9. How many employees do not have any assignments?
10. What's the average seniority of the employees without assignments.
11. Calculate average assignment cost for the employee with the most assignments.
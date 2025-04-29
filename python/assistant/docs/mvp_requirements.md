# MVP Requirements 

Bot is the DIAL application that transforms user request into natural language response (that may contain numerical data) and code that can be executed to solve user request.

## Functional requirements
1. Support of all basic features (pass [integration tests](integration_tests.md) for basic features, see section 3)
2. Bot must solve simple questions (with reasonable success rate around 80%, see appendix):
    - 13/18 Client1
    - 10/10 Client2
    - 8/10- Verizon
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

## Appendix questions

### Client1 questions
1. What percentage of revenue in both years was linear? 
2. What was total net booked revenue in 2023?  
3. Was there a quarter that had more Net Booked Revenue in 2023 than it did in 2022?  
4. What was the YoY Growth in Q1 from 2022 to 2023? 
5. How much of revenue is upfront vs scatter? 
6. Was the advertiser with the biggest spend the same both years? If so, which? 
7. What segment brings in the most revenue? 
8. What three HoldCos brought in the most revenue? 
9. What quarter in 2023 did the Food Subcategory have the lowest net booked revenue? 
10. What was YoY growth in the quarter that had the lowest net booked revenue in the beverage subcategory? 
11. What are the dynamics of revenue by Media Type? Which sector is growing and which is declining? 

### Client2 questions
1. How many rows are there in the dataset?
2. What is the total amount paid for all the claims?
3. How many claims are there with a claim status of "Open"?
4. What is the most common cause of loss in the dataset?
5. Which insured name has the highest outstanding reserves?
6. What is the earliest reported date in the dataset?
7. How many claims have legal costs associated with them?
8. What is the average outstanding reserves amount for the claims in the "Excess Casualty" business segment?
9. What is the total legal cost for the claims in the "Energy" business segment?
10. How many claims are there with a claim status of "Closed" and have zero outstanding reserves?

### Verizon
1. For the first two weeks in October, please compare the first pass failure rates across all the different iPhone models tested. 
2. Show the distribution of test run time versus iPhone model and OS version  
3. Analyze the overall defect rate of units tested versus workstation ID 
4. Compare the defect rates of Apple versus Samsung product 
5. Compare the average and standard deviation of test run times for Apple versus Samsung product  
6. Compare the failure rates of Apple product for different App Versions 
7. Compare the defect failure rates from different return sources 
8. Compare the defect rates and defect distributions from each site 

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
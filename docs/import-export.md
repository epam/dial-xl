## Random Function
Syntax:
```qg
 [x] = RAND(optional seed)
```
The function returns double value in range from 0 inclusively to 1 exclusively.
Arguments:
- seed can be provided to generate values starting from this seed, otherwise default seed is used.

Sample:
```qg
table A
 dim [x] = RANGE(5)    # 1, 2, 3, 4, 5
     [y] = RAND()      # 0.1, 0.05, 0.95, 0.35, 0.61
     [z] = RAND(123)   # 0.43, 0.21, 0.73, 0.58, 0.39
```

## Import Data

I propose extending input panel with ability to import external data into the user bucket.
For example, I want to import data from my-table from some publicly accessible SQL database.
I click import and type all the data I need to access the database. 
I select the file location to store the data in my bucket: /imports/my-table.csv.
Also, I have a checkbox to append timestamp to the file name at the moment of the first import or the following sync operations: /imports/my-table.timestamp.csv.
If it is not checked, then we just override this file over and over again at the following sync operations: /imports/my-table.csv.

I have a button to sync all files and/or have a button to sync each separate file independently. 
When I click I see a status bar with real time information about the process.

Also, I have a button in project to sync all inputs. Since we know the import options (where can show or hide this button, show - when there are any imports with checked box).
I click this button and the frontend finds the latest version of the file and modify the DSL.

## Export Data

I propose to add Export Data support per table or per project.
I click on table and choose Export Data.Then I can choose to download the table content to my local storage or export it to my user bucket.
When I click I see a status bar with real time information about the process.

## Automatic Export Data

Same as export data to my user bucket, but it is automatic process. 
When the table content changes it triggers export data.
There is a problem of how to show the status of this process to an user.

```qg
!output("/exports/my-table1.csv")               # "/exports/my-table1.csv"
table MyTable1
  [x]
  [y]
  
!output("/exports/my-table2.csv", "timestamp") # "/exports/my-table2.timestamp.csv"
table MyTable2
  [a]
  [b]
```
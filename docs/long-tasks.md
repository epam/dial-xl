# Long Running Calculations

### Isolation
1. Project - project has one outstanding calculation at any time.
2. User - user must have permission to the project.

### API (Draft to show the idea)

1. `POST /v1/project/calculate` - calculate a project in background.
```json
{
    "project_name": "required",
}
```

The project is calculated against the latest DSL from DIAL Storage. It will use the latest DSL until it finishes.


2. `POST /v1/project/cancel` - cancel the calculation if a project has one.

```json
 {
     "project_name": "required"
 }
```

The calculation of project is cancelled.

3. `POST /v1/project/status` - check the calculation status if a project has one.

```json
 {
     "project_name": "required"
 }
```

Response:
```json
 {
    "project_name": "required",
    "calculation_status":"RUNNING/NOT_RUNNING"
 }
```

4. `POST /v1/calculate`
```json
{
    "shared": "false/true",
}
```

Add a new flag: shared. False has the same behaviour as for now. 
True means - receive traces for matching parts that were not requested by me, but requested by someone and currently being calculated.
Matching is done using hashes of compiled columns when request arrives.

```
table A
  [x] = FORMULA()
  [y] = FORMULA()
  [z] = FORMULA()
```

* The first request sends a viewport for [x]. 
* The second requests send a viewport for [y]. 
* The first request will end when [x] is calculated. 
* The second request will end when [y] is calculated and [x] is calculated/cancelled.


### Workflow
1. UI mission-critical tasks use the new API.
```
 UI                                                                                           Server
 |                      /v1/calculate (project="my_project", shared="true")                    |
 | ------------------------------------------------------------------------------------------> |
 |                                       SSE response                                          | 
 | <------------------------------------------------------------------------------------------ |
 |                                                                                             |
 |                      15 seconds later. User may confirm long calculation                    |
 |                                                                                             |
 |                            /v1/project/calculate (project="my_project")                     |
 | ------------------------------------------------------------------------------------------> |
 |                                         triggered                                           | 
 | <------------------------------------------------------------------------------------------ |
 |                      15 seconds later. User decides to cancel long calculation              |
 |                                                                                             |
 |                              /v1/project/cancel (project="my_project")                      |
 | ------------------------------------------------------------------------------------------> |
 |                                          canceled                                           | 
 | <------------------------------------------------------------------------------------------ |
 ```
Q: Page refresh? A: Start over.

2. Other side-track tasks use the old API.

### Backend (some thoughts)
* Engine should prioritize calculations for active clients over inactive clients.
* Engine should prioritize viewport calculations over index calculations.
* Engine should compare the complete normalized graph for the current state of the project with the normalized graph of inactive calculations to make decision on which parts are to leave and which to cancel. E.g. source node exists for viewport/index in the complete normalized graph, then this part is left.


### Step 1. Frontend Calculation Awareness

1. Extend compilation response with `hash` field that allows a client to distinguish whether a result is different.

Response:
```proto
message FieldInfo {
    string hash = "SHA-256";
}
```
* `hash` - stable hash of calculation for the given key (column/total), if this value is different from the previous one, then the new result contains new values.

2. Extend calculation response to send runtime information about what is being calculated.

Request:
```
message CalculateWorksheetsRequest {
    optional bool includeProfile;
}
```
* `include_profile` - enables runtime information about what is being computed.

Response:
```
enum ExecutionStatus {
    RUNNING/CANCELLED/SUCCEEDED/FAILED;
}

message ProfileInfo {
    oneof key {
        TableKey tableKey = 1;
        FieldKey fieldKey = 2;
        TotalKey totalKey = 3;
        OverrideKey overrideKey = 4;
    }
    
    string sourceSheet = 5;
    int32 sourceStart = 6;
    int32 sourceEnd = 7;

    ExecutionStatus status = 8 
    optional int64 startedAt = 9;
    optional int64 stoppedAt = 10;
}
```

Server will send ProfileInfo messages per calculation plan. Note that, a source with same sheet/start/end can be sent many times because server splits one formula into many calculation plans.




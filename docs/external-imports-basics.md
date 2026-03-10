# External imports basics

## Data structures

```
IMPORT("MyDataSource/MyDB/MySchema/MyTable", 3)

message DataSource
  id : String
  name : String
  // URL, Creds, etc

message Sync
  Id : int // sequential
  date : Date
  settings: dict<string, string>
```

## Storage:

- DataSourceId/SyncId/MyDB/MySchema/MyTable.csv
- DataSourceId/SyncId/MyDB/MySchema/settings.json

Notes: 
1. We may have a lot of syncs. 
2. Creds (in Source settings) need to be encrypted

## Principles:
Sync (data load from external source for specific version) behaves as a computation
It only works while either:
- At least one client exists that waits for results
- ProjectCalculatRequest exists and current project DSL depends on the given version.

In case sync is canceled (stopped prematurely), it removes all the data (enter "DataSourceId/syncId" folder)

## API Sketch:

```
// Creates sync process, but returns new sequential id immediately.
// Distributed lock guarantees we get next sequential id without race conditions
// Once backend allocates folder for a new version, it stores settings and returns syncId to client
// And starts loading process which will run until either completion (COMPLETED will be sent to client) 
// or until client drops connection
POST /sync(project, source_id, settings) -> Stream(syncId, progress, COMPLETED)

// Settings which we are going to use for sync are supposed to include schema and format conversion options.
// Internal backend design relies on ability to know schema during compilation time 
// Otherwise we would need for data load, to finish compilation, and compilation requests has no infra to do so.
// So client (frontend) required to path field lists in settings, as user may want to tweak it anyway 
// Backend provides a separate API to discover settings in advance.
GET /source(project, source_id, path) -> SettingsMeta

GET /sync_list(project, source_id) -> List<Sync>

GET get "/sync/source_id/id" -> Sync
```
 
## Usecases:

### 1. The user adds data from an external source for the first time.
- User clicks CreateTable or Drag-n-drop DataSource into sheet.
- User get prompted with settings form, which he can skip and go with defaults
- Frontend calls "/sync" and gets newSyncId (settings come from form)
- Frontend immediately adds "IMPORT("MyDataSource/MyDB/MySchema/MyTable", newSyncId)" to DSL.

### 2. Main use case: User clicks sync (global)
- Frontend lists all IMPORTS that need to be updated
- Frontend calls "/sync" for each unique imports (we group imports by datasource/table)
- Settings for each "/sync" are copied from the sync user in the current version of DSL.
- Frontend sets all the new syncIds.

### 3. User clicks sync (one table)
- Exactly the same as above but we do it for a single import formula.

### 4. User sees list of versions in Import panel
- Frontend simply calls /sync_list
- Cancelled/stopped syncs will be missing in the list.

### 5. The user goes to the Import panel and manually pulls the data.
- Frontend calls "/sync" but doesn't change the DSL.
- Progress from the stream can be used to show the progress to the user.

### 6. User changes SyncId  in DSL manually
Only two possibilities:
- We have a "DataSourceId/SyncId" directory. In this case we simply load and use it
- We don't have one. In this case we return an error. "This version of data import was removed, canceled or never existed"

### 7. User rolls back
- Works exactly as above.
- Frontend switches DSL to previous state and access previous data version using previous syncId (if it still exists).
- If it doesn't exist we can only show users and errors.

### 8. User rolls back while data is still pulled
- In case "/sync" is in progress, the frontend can drop it.
- Frontend switches DSL to previous version, which will remove this sync from ongoing "ProjectCalculatRequest" or "CalculateWorksheetsRequest"
- As result backend will cancel the Sync and remove the data,
- The rest will work as above.

### 9. The user changes settings via Details Panel. 
- Current DSL: IMPORT("MyDataSource/MyDB/MySchema/MyTable", 3)
- The user changes settings. 
- Frontend calls "/sync(project, source_id, userDefinedSettings)"
- Frontend immediately sets newSyncId into DSL: IMPORT("MyDataSource/MyDB/MySchema/MyTable", newSyncId)

### A. Double update. 
- Combination of "8", "2/3"
- Frontend cancels ongoing "/sync" and "CalculateWorksheetsRequest"
- Call "/sync"
- Changes DSL

### B. Roll back to previous settings and want to update
- User rolledbacked to the previous version. Say 3. With the previous state of settings. The most recent version is 4.
- User clicks sync (one table), while settings currently seen (or not if panel is closed) in details belongs to version 3.
- Frontend can "/sync(project, source_id, settingsFromVersion3)"
- And updates DSL

## UX basics
1. External sources and Project panel (either inputs or separate section)
2. When user click +, we should choose SourceType (Postgres, Snowflake) and then render modal dialog with settings according to Source Definition
    - API Connection validation: Artsiom TBD
    - API Source settings updates: Artsiom TBD
3. External sources have an hierarchy: MyPostgress/MyShema/MyDb/Tables/Fields
4. [Draft] Once we are on the tables level we can: drag-n-drop or right-click->Create-table
    - And then we show modal dialog with settings (we can customize schema and data conversions)
    - Dialog pre-populated with defaults, so user can instantly click "Done"
5. [Draft] User can click on Table (dataset) and see all the versions (syncs) in separate modal dialog (from context menu)

## Considerations and open questions
1. Many tables per sync
2. Explicit cancel?



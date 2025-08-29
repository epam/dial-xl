# On-the-Fly Calculation

## Overview
This document describes the design of the "Evaluate DSL" feature, which allows users to perform DSL calculations
on-the-fly without needing to update the project code.

## Use Cases
1. Calculate an arbitrary DSL.
2. Calculate an arbitrary DSL within the context of a project.
3. Test changes to a project before committing the updates to the project code.
4. Perform calculations on a project without making any changes to it.

## Viewport
Viewports are utilized to request calculated data. The viewport request includes fields and a row range:
```protobuf
message Viewport {
  repeated string fields = 1;
  sint64 start_row = 2;
  sint64 end_row = 3;
  bool is_content = 4;
}
```
In the case of pivot tables, not all field names might be known in advance. Thus, to simplify the API, specifying an
empty list of fields in a viewport can indicate the intention to apply the viewport to an entire table. When needed,
an automated step can retrieve data for dynamic fields. The effective field list will encompass all table fields,
including the '*' field.

## Evaluate DSL Request

### WebSocket
The request can optionally include a base project reference, DSL, and viewports.
```protobuf
message ProjectRef {
  string project_name = 1;
  // Project version, can be used for validation in case of concurrent changes
  optional sint64 version = 2;
  // Replaces project sheets with the provided ones
  map<string, string> sheets = 3;
}

message EvaluateDslRequest {
  // Base project reference
  optional ProjectRef project = 1;
  // DSL to calculate
  optional string dsl = 2;
  map<string, Viewport> viewports = 3;
}
```
The project parameter facilitates Use Cases 2, 3, and 4, while the DSL parameter is aimed at Use Cases 1 and 2
(in conjunction with a project reference). The project reference must include the project name of an existing project,
with an optional version to prevent applying DSL to a project in a modified state, and optional sheets to replace all
project sheets.

The response is expected to be delivered in the same manner as that for a PutWorksheetRequest but is aimed at a single
subscriber that made the request and listens to individual column data sent asynchronously by the backend.

#### Porting to HTTP
The HTTP request body mirrors the WebSocket request.
```
POST /v1/evaluate-dsl
```
Body Schema:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "project_header": {
      "type": "object",
      "properties": {
        "project_name": {
          "type": "string"
        },
        "version": {
          "type": "integer"
        },
        "sheets": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          }
        }
      },
      "required": [
        "project_name"
      ]
    },
    "dsl": {
      "type": "string"
    },
    "viewports": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "fields": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "start_row": {
            "type": "integer"
          },
          "end_row": {
            "type": "integer"
          },
          "is_content": {
            "type": "boolean"
          }
        },
        "required": [
          "start_row",
          "end_row",
          "is_content"
        ]
      }
    }
  }
}
```
Body Example:
```json
{
  "id": "123456789",
  "project_header": {
    "project_name": "Example Project",
    "version": 1
  },
  "dsl": "table Employees\n  [id] = RANGE(3)\n  [department] = NA\n  [salary] = NA\noverrides...",
  "viewports": {
    "Employees": {
      "fields": ["department", "salary"],
      "start_row": 0,
      "end_row": 2,
      "is_content": false
    }
  }
}
```
Aggregated Response Schema:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "SUCCEED",
        "FAILED",
        "VERSION_CONFLICT",
        "NOT_FOUND",
        "INVALID_PROTOCOL"
      ]
    },
    "error_message": {
      "type": "string"
    },
    "column_data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "table_name": {
            "type": "string"
          },
          "column_name": {
            "type": "string"
          },
          "version": {
            "type": "integer"
          },
          "is_pending": {
            "type": "boolean"
          },
          "error_message": {
            "type": "string"
          },
          "data": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "start_row": {
            "type": "integer"
          },
          "end_row": {
            "type": "integer"
          },
          "type": {
            "type": "string",
            "enum": [
              "UNKNOWN",
              "STRING",
              "DOUBLE",
              "INTEGER",
              "BOOLEAN",
              "DATE",
              "PERIOD_SERIES",
              "TABLE",
              "INPUT",
              "PERIOD_SERIES_POINT"
            ]
          },
          "isNested": {
            "type": "boolean"
          },
          "reference_table_name": {
            "type": "string"
          },
          "period_series": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "points": {
                  "type": "object",
                  "additionalProperties": {
                    "type": "string"
                  }
                }
              },
              "required": [
                "points"
              ]
            }
          }
        },
        "required": [
          "table_name",
          "column_name",
          "version",
          "is_pending",
          "data",
          "start_row",
          "end_row",
          "type",
          "isNested"
        ]
      }
    }
  },
  "required": [
    "id",
    "status"
  ]
}
```
Response Example:
```json
{
  "id": "123456789",
  "status": "SUCCEED",
  "column_data": [
    {
      "table_name": "employees",
      "column_name": "salary",
      "version": 1,
      "is_pending": false,
      "data": [
        "50000",
        "55000",
        "60000"
      ],
      "start_row": 0,
      "end_row": 2,
      "type": "DOUBLE",
      "isNested": false
    },
    {
      "table_name": "employees",
      "column_name": "department",
      "version": 1,
      "is_pending": true,
      "data": [
        "Engineering",
        "HR",
        "Marketing"
      ],
      "start_row": 0,
      "end_row": 2,
      "type": "STRING",
      "isNested": false
    }
  ]
}
```

## Updated API
```protobuf
syntax = "proto3";

package dial.xl;

import "google/protobuf/wrappers.proto";

service DialXLService {
  rpc GetProjectSheets (GetProjectSheetsRequest) returns (GetProjectSheetsResponse) {}
  rpc PutProjectSheets (PutProjectSheetsRequest) returns (PutProjectSheetsResponse) {}
  rpc ParseSheet (ParseSheetRequest) returns (ParseSheetResponse) {}
  rpc ModifySheet (ModifySheetRequest) returns (ModifySheetResponse) {}
  rpc CompileProject (CompileProjectRequest) returns (CompileProjectResponse) {}
  rpc CompileSheet (CompileSheetRequest) returns (CompileSheetResponse) {}
  rpc ComputeProject (ComputeProjectRequest) returns (ComputeProjectResponse) {}
  rpc ComputeSheet (ComputeSheetRequest) returns (ComputeSheetResponse) {}
}

// GetProjectSheets

message GetProjectSheetsRequest {
  string name = 1;
}

message GetProjectSheetsResponse {
  sint64 version = 1;
  map<string, string> sheets = 2;
}

// PutProjectSheets

message PutProjectSheetsRequest {
  string name = 1;
  sint64 version = 2;
  map<string, string> sheets = 3;
}

message PutProjectSheetsResponse {
  sint64 new_version = 1;
}

// ParseSheet

message ParseSheetRequest {
  string dsl = 1;
}

message ParsedDecorator {
  string name = 1;
  map<string, string> args = 2;
}

message ParsedField {
  sint32 position = 1;
  repeated string comments = 2;
  repeated ParsedDecorator decorators = 3;
  string formula = 4;
  bool is_dimension = 5;
  bool is_key = 6;
}

message ParsedTableHeader {
  sint32 position = 1;
  repeated string comments = 2;
  repeated ParsedDecorator decorators = 3;
}

message ParsedOverride {
  sint32 position = 1;
  repeated string values = 2;
}

message ParsedTable {
  ParsedTableHeader header = 1;
  map<string, ParsedField> fields = 2;
  map<string, ParsedOverride> overrides = 3;
}

message ParsingError {
  sint32 line = 1;
  sint32 position = 2;
  string message = 3;
}

message ParseSheetResponse {
  map<string, ParsedTable> tables = 1;
  repeated ParsingError errors = 2;
}

// ModifySheet

message RenameTableOperation {
  string table_name = 1;
  string new_table_name = 2;
}

message RenameFieldOperation {
  string table_name = 1;
  string field_name = 2;
  string new_field_name = 3;
}

message PutTableOperation {
  string table_name = 1;
  // empty to delete entire table
  ParsedTable table = 2;
}

message PutFieldOperation {
  string table_name = 1;
  string field_name = 2;
  // empty to delete
  ParsedField field = 3;
}

message PutOverrideOperation {
  string table_name = 1;
  // missing field means row numbers
  google.protobuf.StringValue field_name = 2;
  ParsedOverride override = 3;
}

message ModifyOperation {
   oneof operation {
     RenameTableOperation rename_table = 1;
     RenameFieldOperation rename_field = 2;
     PutTableOperation put_table = 3;
     PutFieldOperation put_field = 4;
     PutOverrideOperation put_override = 5;
   }
}

message ModifySheetRequest {
  string dsl = 1;
  repeated ModifyOperation operations = 2;
}

message ModifySheetResponse {
  string new_dsl = 1;
}

// CompileProjectRequest

message CompileProjectRequest {
  string name = 1;
  map<string, string> sheets = 2;
}

message ParsedSheet {
  map<string, ParsedTable> tables = 1;
  repeated ParsingError errors = 2;
}

enum FieldType {
    FIELD_TYPE_UNSPECIFIED = 0;
    FIELD_TYPE_STRING = 1;
    FIELD_TYPE_DOUBLE = 2;
    FIELD_TYPE_INTEGER = 3;
    FIELD_TYPE_BOOLEAN = 4;
    FIELD_TYPE_DATE = 5;
    FIELD_TYPE_PERIOD_SERIES = 6;
    FIELD_TYPE_TABLE = 7;
    FIELD_TYPE_INPUT = 8;
    FIELD_TYPE_PERIOD_SERIES_POINT = 9;
}

message CompiledField {
  FieldType type = 1;
  bool is_nested = 2;
  string reference_table_name = 3;
}

message CompiledFieldOrError {
  oneof field_or_error {
    CompiledField field = 1;
    string error = 2;
  }
}

message CompiledTable {
  map<string, CompiledField> fields = 1;
}

message CompiledTableOrError {
  oneof table_or_error {
    CompiledTable table = 1;
    string error = 2;
  }
}

message CompiledSheet {
  ParsedSheet parsed_sheet = 1;
  map<string, CompiledTableOrError> tables = 2;
}

message CompileProjectResponse {
  sint64 version = 1;
  map<string, CompiledSheet> compiled_sheets = 3;
}

// CompileSheetRequest

message CompileSheetRequest {
  string dsl = 1;
}

message CompileSheetResponse {
  CompiledSheet compiled_sheet = 2;
}

// EvaluateProjectRequest

message ViewPort {
  repeated string fields = 1;
  sint64 start_row = 2;
  sint64 end_row = 3;
  bool is_content = 4;
}

message ComputeProjectRequest {
  string name = 1;
  map<string, string> sheets = 3;
  map<string, ViewPort> viewports = 4;
}

message PeriodSeries {
  map<string, string> points = 1;
}

message ComputedField {
  sint64 start_row = 1;
  sint64 end_row = 2;
  repeated string values = 3;
  repeated sint64 overridden_indices = 4;
  repeated PeriodSeries period_series = 5;
}

message ComputedFieldOrError {
  oneof field_or_error {
    ComputedField field = 1;
    string error = 2;
  }
}

message ComputedTable {
  map<string, ComputedFieldOrError> fields = 1;
}

message ComputedSheet {
  CompiledSheet compiled_sheet = 1;
  map<string, CompiledTable> tables = 2;
}

message ComputeProjectResponse {
  sint64 version = 1;
  map<string, ComputedSheet> computed_sheets = 2;
}

// ComputeSheetRequest

message ComputeSheetRequest {
  string dsl = 1;
  map<string, ViewPort> viewports = 2;
}

message ComputeSheetResponse {
  ComputedSheet computed_sheet = 1;
}
```
## How to test Cluster

Control node:
```--spring.config.location=./backend/web/src/main/resources/application-control.yaml```

Compute nodes (You can use different ports to run N nodes):
```--spring.config.location=./backend/web/src/main/resources/application-compute.yaml --server.port=10002```


Payload (create a file query.txt in the project directory):
```json
{
  "id": "test",
  "calculateWorksheetsRequest": {
    "projectName": "my-project-2",
    "worksheets":{
      "x":"table A \n  dim [x] = RANGE(10) \n  [y] = [x] + 10 \n  [z] = [y] + 100"
    },
    "viewports": [
      { "fieldKey": {"table":"A", "field":"x"}, "start_row": 0, "end_row": 100, "is_content":true },
      { "fieldKey": {"table":"A", "field":"y"}, "start_row": 0, "end_row": 100, "is_content":true },
      { "fieldKey": {"table":"A", "field":"z"}, "start_row": 0, "end_row": 100, "is_content":true }
    ]
  }
}
```

Curl:
```curl -X POST -H "content-type: application/json" http://localhost:8080/v1/calculate -d @query.txt```
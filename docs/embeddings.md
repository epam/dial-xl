# Embeddings

## POST v1/embeddings/search

**Description:** Returns the top `n` of the most related fields' values to the query.

**Request example:**
```json
{
    "project": "IMF Demo",
    "version": 4, # optional
    "fields": [
        {
            "table": "Indicators",
            "field": "IndicatorName",
            "n": 2
        },
        {
            "table": "Indicators",
            "field": "CountryName",
            "n": 1
        }
    ],
    "query": "What indicators would you suggest to analyze correlations between unemployment and inflation?"
}
```

**Note:** The maximum `n` will be used if the field is duplicated in the fields.

**Easy request example:**
```json
{
    "project": "IMF Demo",
    "version": 4, # optional
    "search_in_all": true,
    "n": 10,
    "query": "What indicators would you suggest to analyze correlations between unemployment and inflation?"
}
```

**Note:** `search_in_all` is the search in all tables' key string fields.

**Response example:**
```json
{
    "searchResults": [
        {
            "table": "Indicators",
            "field": "IndicatorName",
            "data": "Consumer Prices, period average",
            "score": 0.86
        },
        {
            "table": "Indicators",
            "field": "IndicatorName",
            "data": "Unemployment rate",
            "score": 0.82
        },
        {
            "table": "Indicators",
            "field": "CountryName",
            "data": "Poland",
            "score": 0.1
        }
    ]
}
```

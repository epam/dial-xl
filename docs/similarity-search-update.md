### Improve Similarity Search Experience

#### Use-cases
1. When a user asks a question to the QG Bot, the bot should be able to quickly look up relevant information
from indexed data of entire project to prepare a prompt for the LLM.
2. Regular usage requires the calculation of data that fits within viewports.
3. The user may change the viewport to switch sheets while a previous calculation is still in progress.
4. The user may refresh the page to request the same data again.

#### Objectives
1. Add visibility into embeddings calculation process.
2. Calculate embeddings as soon as data becomes available.
3. Enhance the reliability of search queries made by the QG Bot.
4. Improve the performance of search queries.
5. Remaining requirement: calculate only the necessary data.
6. If the calculation has already started, it should not be immediately interrupted if the user changes
the viewport or closes the page, unless the calculation graph is changed in relevant parts.

### Proposals
1. Split the search request into two stages (data embeddings calculation and search) to enable preparation of embeddings as early as possible.
2. Add a flag to the CalculateWorksheetsRequest to include embeddings calculation in the calculation request, allowing
the user to decide whether to calculate embeddings or not (this should perhaps always be enabled in the UI if the QG Bot is enabled):
   ```protobuf
   message CalculateWorksheetsRequest {
     // ...
     optional bool includeIndices = 6;
   }
   ```
3. Send a list of indices (fields for which embeddings are calculated) and their calculation statuses as part of the calculation response.  
   Proto extension:
   ```protobuf
   message Response {
     // ...
     oneof response {
       // ...
       Index index = 10;
     }
   }

   message Index {
       FieldKey key = 1;
       optional string error_message = 2;
   }

   message CompileResult {
     // ...
     repeated FieldKey indices = 4;
   }
   ```
   The UI may indicate progress until all statuses are received.
4. Reuse the previous graph if available for a new calculation. Perhaps the project name could be used as a key for the graph if provided,
although the project name alone may not be sufficient.
5. Add a delay to the cancellation of calculations when the user drops the connection to give them a chance to reestablish it.
6. (TBD) Consider implementing more permanent storage for embeddings to ensure that data remains available while the project is actively being worked on.
7. To ensure that embeddings are ready before the QG Bot makes queries, the "send message" option may be disabled while indexing is in progress.
8. Embeddings performance may be improved by using different backends (see [tests](https://gitlab.deltixhub.com/Deltix/openai-apps/dial-rag/-/blob/development/docs/new_in_rag_jan_2025.md?ref_type=heads&plain=1#L60)).
!manual()
table 'DIAL Cards'
  !size(3) [CardName] = NA
  !size(2) [Who can help] = NA
  !size(7) [Question] = ""
  [Answer] = ""
  !size(2) [Links] = ""
  !size(2) [Notes] = ""
  !size(3) [Comments] = NA
  [Backup] = ""
override
  [CardName],[Who can help],[Links],[Notes],[Comments],[Question],[Backup]
  "Autogen Initial Dataset","Aliaksei Labanau",,,"Let''s put into backlog","How to get initial GroundTruth dataset?",
  "Fact fetcher","Aliaksei Labanau",,,,,
  "UI Custom Controls","Anton Dubovik",,,"done",,
  "UI Configuration Forms","Anton Dubovik",,,"done",,
  "Custom API Extensions","Uladzislau Vishneuski",,,"done",,
  "App Configs","Anton Dubovik",,,"done",,
  "Stages","Uladzislau Vishneuski","https://epam-rail.com/dial_api#/paths/~1openai~1deployments~1%7BDeployment%20Name%7D~1chat~1completions/post",,"done",,
  "Attachments","Uladzislau Vishneuski","https://epam-rail.com/dial_api#/paths/~1openai~1deployments~1%7BDeployment%20Name%7D~1chat~1completions/post",,"done",,
  "App controls / parameters","Anton Dubovik",,,"done",,
  "Memory",,,"Nothing done yet","Let''s put into backlog",,
  "Application Registration","Aliaksandr Drapko",,,"done",,
  "Tools","Anton Dubovik","https://epam-rail.com/dial_api#/paths/~1openai~1deployments~1%7BDeployment%20Name%7D~1chat~1completions/post",,"done",,
  "Chat API","Maksim Hadalau","https://epam-rail.com/dial_api#tag/Conversations","Renamed to Conversations API","done",,
  "Resource API","Maksim Hadalau",,,"done",,
  "Publication API","Maksim Hadalau",,,"done",,
  "Retrieval",,,,"removed",,
  "Troubleshooting","Aliaksei Banshchyk",,,"done",,
  "Developer Features",,,,"done",,
  "Traces","Aliaksei Banshchyk",,,"done",,
  "Knowledge Discovery","Olena Chystiakova",,,"done",,
  "Exploratory  Analysis","Olena Chystiakova",,,"done",,
  "Talk to data","Daniil Yarmalkevich",,,"done",,
  "Development",,,,"done",,
  "Insurance","Vitali Charnahrebel",,,"pending",,
  "Dependobot. Trivy, ORT Scans","Aliaksei Banshchyk",,,"done",,
  "Other case studies","Arseny Gorokh",,,"pending",,
  "Governance",,,,"done",,
  "PTU Balancer","Aliaksandr Drapko",,,"done",,
  "Web scale vectorestore",,,"Nothing done yet","Let''s put into backlog",,
  "Interceptors","Aliaksandr Stsiapanay",,"Design is not finished","Let''s put into backlog",,
  "Code Interpreter","Anton Dubovik",,"May need to record video","done",,
  "OpenAI Assistant API","Aliaksandr Drapko",,"Nothing done yet","Let''s put into backlog",,
  "Checkmarx, Blackduck","Aliaksei Banshchyk",,,"done",,
  "Azure Application Insights",,,,,,
  "Infinite scale","Aliaksei Vavilau",,,,,
  "Log Preparation","Aliaksei Labanau",,,,,
  "Micromodels",,,"On hold till Tuesday",,,
  "Localization Support","Aliaksandr Drapko",,,"done",,
  "LocalStorage for resources",,,"Nothing done yet","Let''s put into backlog",,
  "Hugging Face Models",,,"Nothing done yet","Let''s put into backlog",,
  "Azure RAG","Anton Dubovik","https://gitlab.deltixhub.com/Deltix/openai-apps/dial-azure-search-rag",,"done",,
  "Development",,,,,"How DIAL can help with GemAI centric application development?","At AI DIAL, our approach to software development is defined by a commitment to producing clean, concise, and well-structured code. We believe in transparency and choose clear, understandable solutions over those that might obscure details under complex implementations. We are cautious about introducing new tech dependencies, ensuring each addition is justified with clear goals, long-term consequence analysis, and a review of alternatives. We avoid reinventing the wheel and overengineering, focusing instead on readability and maintainability. We uphold a strict policy against dead code and changes without test coverage, while also limiting the use of config flags, modes, or regimes to reduce complexity. Lastly, our comments are designed to explain the motivation behind the code, rather than the implementation itself. This philosophy ensures that our solution is robust, efficient, and easy to understand and maintain."
  "Research",,,,,"What research tools DIAL provides? Any original GenAI research conducted by the team?",
  "Business Implementations",,,,,"What business cases where solved with DIAL? In what verticals DIAL has blueprint implementations? ","AI DIAL is a secure, enterprise-grade and open-source platform. It has an API-first, cloud and model-agnostic design that makes it suitable for a wide variety of use cases. Our primary focus is to avoid reliance on particular cloud or LLM vendors, support scalability and security, avoid increasing tech complexity or licensing risks. We prioritize developing use case-agnostic generic features that facilitate developing of GenAI applications.\u00a0Modular, composable design philosophy means rapid development from prototypes to production applications."
  ,,,,,,

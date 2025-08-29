### Access Control Requirements for DIAL XL API

#### 1. Access Types

- **JWT**:

  For applications that can obtain a JWT, such as web applications.

- **API Key**:

  For programmatic access, users should be able to use a DIAL API key.

#### 2. DIAL Core Integration (to be implemented)

- **Authorization and Permissions**:
  - DIAL XL uses DIAL to store projects and input files.
  - DIAL controls access to projects and input files by key or JWT. Keys and user permissions are configured in the DIAL application.
  - [Initial implementation] Users should be able to perform operations in DIAL XL, such as computation, if they can successfully authenticate<sup>1</sup> with DIAL.
  - DIAL should provide an endpoint for validating API keys.


  1. _Authenticated users are those who provide a valid API key or JWT._

#### 3. API Capabilities and Access Control

- **Create Client**:

  The constructor accepts one of the below credential providers for obtaining credentials:
  ```python
  class ApiKeyProvider(ABC):
      async def get_api_key(self) -> str:
          """Get the API key."""
          pass
  
  
  class JwtProvider(ABC):
      async def get_jwt(self) -> str:
          """Get the JWT."""
          pass
  
  
  CredentialProvider = ApiKeyProvider | JwtProvider
  
  
  Client(host: str, port: int, credential_provider: CredentialProvider)
  ```

  Both the API key and JWT may have shorter lifetime than the client instance.

  Helper classes for static credentials:
  ```python
  class ApiKey(ApiKeyProvider):
      """API key holder"""
      def __init__(self, api_key: str):
          self.__api_key = api_key
  
      async def get_api_key(self) -> str:
          return self.__api_key
  
  
  class Jwt(JwtProvider):
      """JWT holder"""
      def __init__(self, jwt: str):
          self.__jwt = jwt
  
      async def get_jwt(self) -> str:
          return self.__jwt
  ```

- **Create Project Locally**:

  No permissions required. Users can create projects locally as Python objects.
  ```python
  Client.create_project(project_name: str) -> Project
  ```

- **Read Existing Project Files**:

  Requires read permissions: users can access existing project files if they have the necessary permissions.
  ```python
  Client.parse_project(project_name: str) -> Project
  ```

- **Parse DSL Code into a Sheet Object**:

  For "authenticated" users.
  ```python
  Client.parse_sheet(name: str, dsl: str) -> Sheet
  ```

- **Compile Project**:

  For "authenticated" users. Users may also be required to have access to input files if used in code.
  ```python
  Project.compile()
  ```

- **Compute Project**:

  For "authenticated" users. Users may also be required to have access to input files if used in code.
  ```python
  Project.compute(viewports: dict[str, Viewport])
  ```

- **Save Project**:

  Requires modify permission for a project. Any changes made to the project locally will only be saved when this operation is called.
  ```python
  Project.save()
  ```

#### 4. Use-Cases

- **Web Application Access with JWT**:

  - Provided JWT
    ```python
    client = Client("localhost", 5000, Jwt("my-jwt"))
    ```

  - Renewable JWT
    ```python
    class RenewableJwtProvider(JwtProvider):
        async def get_jwt(self) -> str:
            # 1. Verify the JWT
            # 2. Renew the JWT if necessary
            # ...

    client = Client("localhost", 5000, RenewableJwtProvider())
    ```

- **Programmatic Access**:

  - Configured API key
    ```python
    class EnvVarApiKeyProvider(ApiKeyProvider):
        async def get_api_key(self) -> str:
            return os.getenv("DIAL_API_KEY")
    
    client = Client("localhost", 5000, EnvVarApiKeyProvider())
    ```

  - Multi-user access with API key
    ```python
    current_api_key = contextvars.ContextVar("current_api_key")

    class ContextApiKeyProvider(ApiKeyProvider):
        async def get_api_key(self) -> str:
            return current_api_key.get()

    client = Client("localhost", 5000, ContextApiKeyProvider())
    
    @app.post("/parse_project/{name}")
    async def create_project(request: Request, name: str):
        current_api_key.set(request.headers["api-key"])
        project = client.parse_project(name)
        # ...
    ```
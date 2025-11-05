<h1 align="center">
         DIAL XL
    </h1>
    <p align="center">
        <p align="center">
        <a href="https://dialx.ai/">
          <img src="https://dialx.ai/dialx_logo.svg" alt="About DIALX">
        </a>
    </p>
<h4 align="center">
    <a href="https://discord.gg/ukzj9U9tEe">
        <img src="https://img.shields.io/static/v1?label=DIALX%20Community%20on&message=Discord&color=blue&logo=Discord&style=flat-square" alt="Discord">
    </a>
</h4>

---

## Documentation

The documentation of the project could be found in the [docs](docs) folder.

---

## Run backend locally

Make sure that you have installed java-17; use `java -version` to verify.  
Create `application-local.yaml` in [resources](backend/web/src/main/resources) folder.  
Copy [application.yaml](backend/web/src/main/resources/application.yaml) to `application-local.yaml` 
and replace missing configurations (env-variables) with local one, for example:
```yaml
web:
  storage:
    local:
      projectsFolder: ${PROJECTS_FOLDER}
```

should be replaced to
```yaml
web:
  storage:
    local:
      projectsFolder: /tmp/projects
```
Execute `./gradlew -Dspring.profiles.active=local bootRun` to run a backend server

> [!TIP] 
> To run backend using Intellij IDEA - add `local` to Active profiles in Run/Debug configuration.

---


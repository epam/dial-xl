## Airbyte source - DIAL CSV

### How to build

```bash
./gradlew :shadowJar
```

To make the image visible inside a kind cluster, run:
```bash
kind load docker-image <image> -n <namespace>
```
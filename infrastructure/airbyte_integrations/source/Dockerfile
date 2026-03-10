FROM eclipse-temurin:17-jre-alpine

RUN addgroup -S airbyte && adduser -S airbyte -G airbyte
WORKDIR /airbyte
COPY --chown=airbyte:airbyte airbyte-integrations/source/build/libs/*-all.jar /airbyte/source.jar

ENV AIRBYTE_ENTRYPOINT="java -jar /airbyte/source.jar"

USER airbyte

ENTRYPOINT ["java", "-jar", "/airbyte/source.jar"]
FROM eclipse-temurin:17-jre-alpine

RUN addgroup -S airbyte && adduser -S airbyte -G airbyte
WORKDIR /airbyte
COPY --chown=airbyte:airbyte airbyte-integrations/destination/build/libs/*-all.jar /airbyte/destination.jar

ENV AIRBYTE_ENTRYPOINT="java -jar /airbyte/destination.jar"

USER airbyte

ENTRYPOINT ["java", "-jar", "/airbyte/destination.jar"]
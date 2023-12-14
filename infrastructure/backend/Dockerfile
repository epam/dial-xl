FROM eclipse-temurin:17-jdk

RUN mkdir /opt/quantgrid/
WORKDIR /opt/quantgrid/

# Copy spring boot jar and application yaml
COPY backend/web/build/libs/server.jar /opt/quantgrid/server.jar
COPY backend/web/src/main/resources/application.yaml /opt/quantgrid/application.yaml
RUN chmod a+x /opt/quantgrid/server.jar

EXPOSE 8080
ENTRYPOINT /opt/quantgrid/server.jar
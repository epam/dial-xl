FROM eclipse-temurin:17-jdk

RUN apt update && apt install -y python3-pip
RUN pip3 install numpy pandas scikit-learn --break-system-packages

RUN mkdir /opt/quantgrid/
WORKDIR /opt/quantgrid/

# Copy spring boot jar and application yaml
COPY backend/web/build/libs/server.jar /opt/quantgrid/server.jar
COPY backend/web/src/main/resources/application-cluster.yaml /opt/quantgrid/application.yaml

RUN chmod a+x /opt/quantgrid/server.jar

EXPOSE 8080
ENTRYPOINT /opt/quantgrid/server.jar

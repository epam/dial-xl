FROM eclipse-temurin:17-jdk

RUN sed -i -E 's@^URIs:.+ubuntu\.com.+@URIs: http://ftp.uni-stuttgart.de/ubuntu/@' /etc/apt/sources.list.d/ubuntu.sources
RUN apt update && apt install -y python3-pip
RUN pip3 install numpy pandas scikit-learn --break-system-packages

RUN mkdir /opt/quantgrid/
WORKDIR /opt/quantgrid/

# Copy spring boot jar and application yaml
COPY backend/web/build/libs/server.jar /opt/quantgrid/server.jar
COPY backend/web/src/main/resources/application-cluster.yaml /opt/quantgrid/application.yaml
COPY embedding_models /opt/quantgrid/embedding_models

RUN chmod a+x /opt/quantgrid/server.jar

EXPOSE 8080
ENTRYPOINT /opt/quantgrid/server.jar

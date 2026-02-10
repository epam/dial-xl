FROM eclipse-temurin:17-jdk

RUN sed -i -E 's@^URIs:.+ubuntu\.com.+@URIs: http://ftp.uni-stuttgart.de/ubuntu/@' /etc/apt/sources.list.d/ubuntu.sources
RUN apt update && apt install -y python3-pip
RUN pip3 install numpy pandas scikit-learn --break-system-packages

RUN mkdir /opt/quantgrid/
WORKDIR /opt/quantgrid/

# Copy spring boot jar and application yaml
COPY backend/web/build/distributions/qg-*.tar /opt/quantgrid/qg.tar
RUN tar -xf /opt/quantgrid/qg.tar --strip-components=1 && rm /opt/quantgrid/qg.tar
COPY backend/web/src/main/resources/application.yaml /opt/quantgrid/application.yaml
COPY embedding_models /opt/quantgrid/embedding_models

EXPOSE 8080
ENTRYPOINT /opt/quantgrid/bin/qg
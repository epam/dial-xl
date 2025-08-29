#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
ARG java_image_tag=17-jdk

FROM eclipse-temurin:${java_image_tag}

ARG spark_uid=185

# Before building the docker image, first build and make a Spark distribution following
# the instructions in https://spark.apache.org/docs/latest/building-spark.html.
# If this docker file is being used in the context of building your images from a Spark
# distribution, the docker build command should be invoked from the top level directory
# of the Spark distribution. E.g.:
# docker build -t spark:latest -f kubernetes/dockerfiles/spark/Dockerfile .

RUN set -ex && \
    apt-get update && \
    ln -s /lib /lib64 && \
    apt install -y curl bash tini libc6 libpam-modules krb5-user libnss3 procps net-tools && \
    mkdir -p /opt/spark && \
    mkdir -p /opt/spark/work-dir && \
    rm /bin/sh && \
    ln -sv /bin/bash /bin/sh && \
    echo "auth required pam_wheel.so use_uid" >> /etc/pam.d/su && \
    chgrp root /etc/passwd && chmod ug+rw /etc/passwd && \
    rm -rf /var/cache/apt/* && rm -rf /var/lib/apt/lists/*

ENV SPARK_HOME /opt/spark

# Download an official build as a source for binaries.
# Clean up in the end as a single command to keep the layer small.
RUN curl https://archive.apache.org/dist/spark/spark-3.3.2/spark-3.3.2-bin-hadoop3-scala2.13.tgz -o /tmp/spark.tgz && \
    tar -xvzf /tmp/spark.tgz -C /tmp/ && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/jars ${SPARK_HOME}/jars && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/bin ${SPARK_HOME}/bin && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/sbin ${SPARK_HOME}/sbin && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/examples ${SPARK_HOME}/examples && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/kubernetes/tests ${SPARK_HOME}/tests && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/data ${SPARK_HOME}/data && \
    mv /tmp/spark-3.3.2-bin-hadoop3-scala2.13/RELEASE ${SPARK_HOME}/RELEASE && \
    rm -rf /tmp/* && \
    # AWS S3 (s3a) access; trying to avoid using aws-java-sdk-bundle (~200MB)
    curl https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.2/hadoop-aws-3.3.2.jar -o ${SPARK_HOME}/jars/hadoop-aws-3.3.2.jar && \
    curl https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-s3/1.11.1026/aws-java-sdk-s3-1.11.1026.jar -o ${SPARK_HOME}/jars/aws-java-sdk-s3-1.11.1026.jar && \
    curl https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-core/1.11.1026/aws-java-sdk-core-1.11.1026.jar -o ${SPARK_HOME}/jars/aws-java-sdk-core-1.11.1026.jar

# Copy local files: scripts are taken from the source code, but let's keep our own copy in case we want to modify them
COPY infrastructure/backend/entrypoint.sh /opt/
COPY infrastructure/backend/decom.sh /opt/

WORKDIR /opt/spark/work-dir
RUN chmod g+w /opt/spark/work-dir
RUN chmod a+x /opt/decom.sh

# Copy spring boot jar and application yaml
COPY backend/web/build/libs/server.jar /opt/quantgrid/server.jar
COPY backend/web/src/main/resources/application.yaml /opt/quantgrid/application.yaml
COPY embedding_models /opt/quantgrid/embedding_models

ENTRYPOINT ["/opt/entrypoint.sh"]

# Specify the User that the actual main process will run as
USER ${spark_uid}

# Build and Test Spark Base Docker Image

## Dockerfile

Backend's `Dockerfile`, `entrypoint.sh` and `decom.sh` are taken from the official Spark binaries as a starting point
and modified to download the distribution during the image building process.
In addition to that extra libraries for AWS S3 are added right away.

## How to Run

1. It's recommended to install [minikube](https://minikube.sigs.k8s.io/docs/) and `kubectl`.
   Follow [Get Started!](https://minikube.sigs.k8s.io/docs/start/) guide and install **docker-based** version.
   For MacOS is recommended to follow the
   tutorial [Using minikube as Docker Desktop Replacement](https://minikube.sigs.k8s.io/docs/tutorials/docker_desktop_replacement/)

2. Recommended settings before and after minikube startup.
   NB: The last command points a docker client to the docker daemon in the minikube.
   As a result the image we build will be pushed there rather than locally.
```
minikube config set container-runtime docker
minikube config set memory 4096
minikube config set cpus 3
minikube config set kubernetes-version 1.23.13

minikube start

minikube addons enable ingress
minikube addons enable ingress-dns

kubectl create serviceaccount spark
kubectl create clusterrolebinding spark-role --clusterrole=edit --serviceaccount=default:spark --namespace=default

# points a local docker client to a docker deamon in VM of a minikube
eval $(minikube -p minikube docker-env)
```

3. Build backend base image and push it to the minikube's registry.
   NB: The previous command should be executed in the same terminal as the next
   build command to push image to the minikube.
```
docker build -f infrastructure/backend/Dockerfile . -t spark:v3.3.2
```

4. Copy `Kubernetes control plane is running at` address from
```
kubectl cluster-info
```

5. Run Pi calculation on Spark to test the setup.

Using local binaries of Spark 3.3.2 a test job could be submitted using the following command.
NB: replace `https://localhost:52344` with the address from the previous step.
```
./bin/spark-submit --master k8s://https://localhost:52344 \
   --deploy-mode cluster \
   --name spark-pi \
   --class org.apache.spark.examples.SparkPi \
   --executor-cores 1 \
   --num-executors 2 \
   --executor-memory 500M \
   --conf spark.kubernetes.container.image=spark:v3.3.2 \
   --conf spark.kubernetes.authenticate.driver.serviceAccountName=spark \
   --conf spark.decommission.enabled=true \
   local:///opt/spark/examples/jars/spark-examples_2.13-3.3.2.jar
```

Using ad-hoc pod with the image that was just built

```
# launch ad-hoc pod
kubectl run --rm sparksubmitpod --image=spark:v3.3.2 --overrides='{ "spec": { "serviceAccount": "spark" }  }' -it -- /bin/bash

# submit pi from within the pod
/opt/spark/bin/spark-submit \
--master "k8s://https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT_HTTPS}" \
--deploy-mode cluster \
--name spark-pi \
--class org.apache.spark.examples.SparkPi \
--executor-cores 1 \
--num-executors 2 \
--executor-memory 500M \
--conf spark.kubernetes.container.image=spark:v3.3.2 \
--conf spark.kubernetes.authenticate.driver.serviceAccountName=spark \
--conf spark.decommission.enabled=true \
local:///opt/spark/examples/jars/spark-examples_2.13-3.3.2.jar

# launch server from within the pod
/opt/entrypoint.sh server
```
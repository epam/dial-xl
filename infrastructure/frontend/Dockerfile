FROM nginx:stable-alpine3.21-perl

ARG CORE_HOST
ARG EXTERNAL_DOMAIN
ARG EXT_PREFIX
ARG CORE_DNS_SUFFIX
ARG RESOLVER
ENV CORE_HOST=${CORE_HOST} \
    RESOLVER=${RESOLVER}

COPY infrastructure/frontend/nginx /etc/nginx
COPY infrastructure/frontend/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY frontend/dist /frontend
COPY frontend/dist /frontend

ENTRYPOINT ["/entrypoint.sh"]

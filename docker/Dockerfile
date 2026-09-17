FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.30.4-alpine AS runtime

ENV DEMO_MODE=true \
    MILL_ID=cascade \
    FAKE_DATA_SEED=demo-seed-v1 \
    DASHBOARD_PORT=8080

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/15-dashboard-runtime.envsh /docker-entrypoint.d/15-dashboard-runtime.envsh
COPY docker/healthcheck.sh /usr/local/bin/dashboard-healthcheck

RUN sed -i 's/\r$//' /docker-entrypoint.d/15-dashboard-runtime.envsh \
    && sed -i 's/\r$//' /usr/local/bin/dashboard-healthcheck \
    && chmod +x /docker-entrypoint.d/15-dashboard-runtime.envsh /usr/local/bin/dashboard-healthcheck \
    && mkdir -p \
        /tmp/nginx/client_temp \
        /tmp/nginx/proxy_temp \
        /tmp/nginx/fastcgi_temp \
        /tmp/nginx/uwsgi_temp \
        /tmp/nginx/scgi_temp \
    && chown -R nginx:nginx \
        /usr/share/nginx/html \
        /etc/nginx/conf.d \
        /tmp/nginx
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD ["/usr/local/bin/dashboard-healthcheck"]

CMD ["nginx", "-g", "daemon off;"]

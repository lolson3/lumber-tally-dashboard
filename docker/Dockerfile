FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.30.4-alpine AS runtime

ENV DEMO_MODE=true \
    MILL_ID=agwood \
    FAKE_DATA_SEED=demo-seed-v1 \
    DASHBOARD_PORT=8080

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/15-dashboard-runtime.envsh /docker-entrypoint.d/15-dashboard-runtime.envsh

RUN sed -i 's/\r$//' /docker-entrypoint.d/15-dashboard-runtime.envsh \
    && chmod +x /docker-entrypoint.d/15-dashboard-runtime.envsh \
    && mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp \
    && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d /tmp/nginx

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]

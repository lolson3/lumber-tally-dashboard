FROM node:22-bookworm-slim

ENV DEMO_MODE=true \
    VITE_MILL_ID=agwood \
    VITE_DASHBOARD_PORT=5173
WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY --chown=node:node . .
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

USER node
EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.VITE_DASHBOARD_PORT||'5173')+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./start.sh"]

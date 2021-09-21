# =====================
#     Base Image
# =====================
FROM node:15.3-alpine AS base

# Create app directory
WORKDIR /opt/flowbroker-ui

# Install app dependencies
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY red.js ./red.js

COPY app ./app
COPY config ./config

# Build code for production
RUN npm install --only=prod
RUN npm run build

# =====================
#   Production Image
# =====================
FROM node:15.3-alpine

WORKDIR /opt/flowbroker-ui

COPY --from=base /opt/flowbroker-ui /opt/flowbroker-ui

EXPOSE 8000

CMD ["npm", "run", "app"]

# HEALTHCHECK schema
# HEALTHCHECK --start-period=2m --interval=30s --timeout=10s --retries=3 \
# CMD curl -f http://localhost:9000/health || exit 1

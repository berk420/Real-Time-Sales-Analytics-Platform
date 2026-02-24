FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* .npmrc* ./ 2>/dev/null || true
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.25
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .

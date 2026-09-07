FROM docker.io/library/node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

# One-shot build container: produces /app/dist into a shared named volume.
FROM docker.io/library/node:22-alpine

WORKDIR /app

COPY --from=build /app/dist /app/dist

CMD ["node", "--version"]
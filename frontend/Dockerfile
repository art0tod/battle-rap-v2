FROM node:22-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=development

EXPOSE 3001

CMD ["pnpm", "dev"]

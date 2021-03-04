FROM node:lts

RUN npm install -g pm2

WORKDIR /sync-backend
COPY . /sync-backend

RUN yarn install && yarn cache clean

EXPOSE 80

CMD ["pm2-docker","process.yml"]

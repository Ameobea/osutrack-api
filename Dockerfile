FROM node:15.8.0-stretch-slim

ADD . /app
WORKDIR /app

RUN yarn && yarn build

CMD yarn start

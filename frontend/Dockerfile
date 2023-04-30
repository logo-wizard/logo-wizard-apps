ARG NODE_IMAGE=node:19.3.0

FROM ${NODE_IMAGE} as frontend_builder

WORKDIR /code

ADD package.json .
ADD yarn.lock .

RUN yarn install

ADD . .

RUN ls -lah
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL $REACT_APP_API_URL
ARG REACT_APP_KC_URL
ENV REACT_APP_KC_URL $REACT_APP_KC_URL
RUN yarn build

FROM nginx:alpine

COPY --from=frontend_builder /code/build/ /usr/share/nginx/html
ADD nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 80

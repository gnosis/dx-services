FROM node:8.9.4-alpine

RUN apk update && \
apk add --no-cache bash git openssh wget ca-certificates

RUN apk add --no-cache --virtual .gyp \
  python \
  make \
  g++

# Create app directory
WORKDIR /usr/src/app/

# Setup init process
#   - For more info see: https://github.com/Yelp/dumb-init
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.1/dumb-init_1.2.1_amd64
RUN chmod +x /usr/local/bin/dumb-init

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --pure-lockfile
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

# Expose container port
EXPOSE 8080

# Run Node app as child of dumb-init
ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD [ "npm", "start" ]

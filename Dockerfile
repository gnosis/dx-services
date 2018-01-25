FROM node:8.9.4-alpine

RUN apk update && \
apk add --no-cache bash git openssh

# Create app directory
WORKDIR /usr/src/app/

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
# EXPOSE 8080

CMD [ "npm", "start" ]

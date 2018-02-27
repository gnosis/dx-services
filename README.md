[![Coverage Status](https://coveralls.io/repos/github/gnosis/gnosisdb/badge.svg?branch=master)](https://coveralls.io/github/gnosis/gnosisdb?branch=master)

# Dutch Exchange Services

## Run with docker-compose
This app contains a docker-compose configuration.

This commands may be used with sudo depending on configuration.
```bash
docker-compose build
docker-compose up
```
The build command has to be executed after any change in code/deps

## Run with docker manually
This app contains a configuration to run in docker

```bash
docker build -t <tag-name> .
```

### Check image added to docker
```bash
docker images
```
### Run the image
* `-d` run deatached mode (run in background)
* `-p` redirect public port to private port in container

```bash
docker run -p 8000:3000 <tag-name>
```

#### Get container ID
```bash
docker ps
```
#### Print app output
```bash
docker logs <container id>
```


## Develop
```bash
yarn install
npm run rpc
npm run contracts-deploy
npm run cli -- --setup
```

Start app:
```bash
npm start
```

Use the bot-cli:
```bash
npm run cli
```

Some examples:
* `npm run cli -- --balances`
* `npm run cli -- --approve-token RDN`
* `npm run cli -- --deposit ETH,100`
* `npm run cli -- --sell ETH,RDN,100`
* `npm run cli -- --buy RDN,ETH,100`
* `npm run cli -- --time 0.5`
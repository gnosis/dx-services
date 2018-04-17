[![Coverage Status](https://coveralls.io/repos/github/gnosis/dx-services/badge.svg?branch=master)](https://coveralls.io/github/gnosis/dx-services?branch=master)

# Dutch Exchange Services

# Run in Rinkeby
Use the CLI:
```bash
docker run \
  -e NODE_ENV=dev \
  -e NETWORK=rinkeby \
  gnosispm/dx-services:develop \
  npm run cli -- \
    state WETH-RDN
```

For more information about the CLI usage, refer to:
* TODO: Document all operations

Start API:
```bash
docker run \
  -e NODE_ENV=dev \
  -e NETWORK=rinkeby \
  gnosispm/dx-services:develop \
  npm run start
```

Start bots (not yet merged to develop, so it won't work for now)
```bash
docker run \
  -e NODE_ENV=dev \
  -e NETWORK=rinkeby \
  gnosispm/dx-services:develop \
  npm run bots
```

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
npm run cli2 -- --setup
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
* `npm run cli -- state WETH-RDN`
* `npm run cli -- send 0.5 WETH 0x627306090abaB3A6e1400e9345bC60c78a8BEf57`
* `npm run cli -- deposit 0.5 WETH`
* `npm run cli -- deposit 150 RDN`
* `npm run cli -- sell 100 WETH-RDN`
* `npm run cli -- buy 100 RDN-WETH`

## cli2 (Deprecated)
The `cli2`, is deprectated, but it still has some methods that were not migrated
 to the new cli (they are methods used testing during development).

Use the bot-cli2:
```bash
npm run cli2
```


Some examples:
* `npm run cli2 -- --balances`
* `npm run cli2 -- --approve-token RDN`
* `npm run cli2 -- --deposit WETH,100`
* `npm run cli2 -- --time 0.5`

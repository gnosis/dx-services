# Dutch Exchange Services


## Run with docker
This app contains a configuration tu run in docker

docker build -t tag-name .

### Check image added to docker
docker images

### Run the image
-d run deatached mode (run in background)
-p redirect public port to private port in container

docker run -p 8000:3000 tag-name

#### Get container ID
docker ps

#### Print app output
$ docker logs <container id>

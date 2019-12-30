# shakemap4-web

```
$ git clone https://github.com/INGV/shakemap4-web
$ cd shakemap4-web
```

## Configure
Copy docker environment file:
```
$ cp ./Docker/env-example ./Docker/.env
```
### Set NGINX port
Set `NGINX_HOST_HTTP_PORT` in `./Docker/.env` file (default port is `8091`).

### Set 'data' path
Set `SHAKEMAP_DATA_PATH` with the absolte `data` path; ie: `/home/shake/shakemap4/shakemap_profiles/world/data`

### !!! On Linux machine and no 'root' user !!!
To run container as *linux-user* (intead of `root`), set `WORKSPACE_PUID` and `WORKSPACE_PGID` in `./Docker/.env` file with:
- `WORKSPACE_PUID` should be equal to the output of `id -u` command
- `WORKSPACE_PGID` should be equal to the output of `id -g` command

## Start shakemap4-web
First, build docker images:

```
$ cd Docker
$ docker-compose up -d
$ cd ..
```

## How to use it
When all containers are started, connect to: 
- http://<your_host>:<your_port>/

default is:
- http://localhost:8091

If all works, you should see ShakeMap4-Web web page.

## Tips and tricks
### To change nginx port live:
1) Update `NGINX_HOST_HTTP_PORT` in `.env`
2) run:
```
$ docker-compose build nginx
```
3) Restart docker:
```
$ docker-compose up --no-deps -d nginx
```

### Rebuild an image from existing `Dockerfile` (es: workspace)
```
$ docker-compose build --no-cache workspace
```

### Rebuild an image from a remote image (es: nginx)
```
$ docker-compose pull nginx
```

## Thanks to
This project uses the [Laradock](https://github.com/laradock/laradock) idea to start docker containers

## Contribute
Please, feel free to contribute.

## Author
(c) 2019 Dario Jozinovic dario.jozinovic[at]ingv.it \
(c) 2019 Valentino Lauciani valentino.lauciani[at]ingv.it


Istituto Nazionale di Geofisica e Vulcanologia, Italia

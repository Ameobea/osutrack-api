docker-build:
  docker build -t osutrack-api:latest .

build-and-deploy:
  just docker-build
  docker save osutrack-api:latest | bzip2 > /tmp/osutrack-api.tar.bz2
  scp /tmp/osutrack-api.tar.bz2 debian@ameo.dev:/tmp/osutrack-api.tar.bz2
  ssh debian@ameo.dev -t 'cat /tmp/osutrack-api.tar.bz2 | bunzip2 | docker load && docker kill osutrack-api && docker container rm osutrack-api && docker run   --name osutrack-api   --restart=always   -d   -p 22000:22000   -v /opt/conf/osutrack/api-conf.toml:/opt/conf.toml   osutrack-api:latest    && rm /tmp/osutrack-api.tar.bz2'

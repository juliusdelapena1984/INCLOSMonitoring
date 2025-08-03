# INCLOSMonitoring
Light Of Salvation Monitoring Application

How to install all the Python App libraries:
- $ pip install -r requirements.txt 

How to install library and add to requirements.txt:
- $ pip install sqlalchemy
- $ pip freeze > requirements.txt

How to execute docker build for NGROK - validate image and container
- $ docker compose -f docker-compose-ngrok.yml up --build
- $ docker images
- $ docker ps

For NGROK setup, the container is running locally and expose to the INTERNET using NGROK tunnel.

How to execute docker build for RAILWAY
- $ docker compose -f docker-compose-railway.yml --build
- $ docker images
- $ sh docker-push-images.sh

How to terminate docker container and delete orphans
- $ docker compose down -v --rmi all --remove-orphans
- $ docker system prune -a --volumes -f
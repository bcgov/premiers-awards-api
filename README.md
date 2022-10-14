# Premier's Awards API

[![Lifecycle:Maturing](https://img.shields.io/badge/Lifecycle-Maturing-007EC6)](<http://gov.bc.ca>)

## Description

NodeJS RESTful API used to manage data for the Premier's Awards nomination and table registration data.

## Installation

### Local Development

To deploy locally:

1. Install the following initialized MongoDB database using `docker-compose`:
```
version: '3.7'
services:
  mongodb_container:
    image: mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root_password
      MONGO_INITDB_DATABASE: premiersawards
    ports:
      - 27017:27017
    volumes:
      - mongodb_data_container:/data/db
volumes:
  mongodb_data_container:
```

2. Create the following `.env` file and save it to the API root directory:

```
NODE_ENV=local
DEBUG=true
APP_BASE_URL=http://localhost

API_PORT=3000
ADMIN_APP_PORT=3001
NOMINATIONS_APP_PORT=3002
TABLE_REGISTRATIONS_APP_PORT=3003

DATABASE_HOST=localhost
DATABASE_PORT=27017
DATABASE_USER=root
DATABASE_PASSWORD=rootpassword
DATABASE_NAME=premiersawards
DATABASE_AUTH=admin

SUPER_ADMIN_GUID=1234567abcdef
SUPER_ADMIN_USER=test_admin
```
Set the ports to match the client ports deployed.

### Kubernetes Deployment

- TBA
# Starting a local development server

This guide offers running external services (databases, Keycloak) and backend apps in Docker and frontend natively.

Before running any apps start and prepare external services:
- Run `docker-compose -f docker-compose.external-services.yaml up` inside the root directory of the repository
- Inside local-dev directory run `make prepare-ext`, this will create tables in Postgres and a bucket in s3, after which mockup backgrounds will be uploaded into s3. Note that s3 doesn't have a volume mounted at the moment, so this should be done on every startup
- Prepare Keycloak
  - Open Keycloak admin console (should be http://localhost:28080 -> Administration Console, login and password are both `admin`)
  - Click on the realm in the top left corner and create a new one by importing the `realm-export.json` file
  - Activate the newly created realm, navigate to `Clients -> logo-backend -> Credentials` and set Client secret to the value from the apps docker-compose file (from the `KEYCLOAK__CLIENT_SECRET_KEY` environment variable)
  - You will need a user to test the app, so go to `Users -> Add user` and create one
  - Open the user you just created and open the "Credentials" tab, click "Set password", set a password and disable the "Temporary" switch

Build backend docker images by running the following sequence of commands inside the "backend" directory:
- `make build-base-base` to build the base-base image
- here you may want to comment the `xformers` dependency inside `backend/logo_worker.setup.py` because it may not install locally (because it needs a GPU), but we don't actually need it if we are going to mock ML-models locally
- `make build-base` to build the base backend image

Now we can actually start backend apps, inside the root of the repository run:
- `docker-compose -f docker-compose.apps.yaml up --build`

You may need to re-build backend images when you make changes in the code, to do that you can use the following command inside the root directory of the repository:
- `cd backend && make build-base && cd ..`

After a minute or so backend apps will initialize, and you should have external services and backend apps running. From there you would want to start the UI local dev server by running `npm run start-outside-docker` from the frontend directory, which will start the server and open the main page in the default browser.

You may now log in with the credentials you set up earlier in the Keycloak administration console and proceed with exploring the app or making changes.

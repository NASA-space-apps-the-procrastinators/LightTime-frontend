# LightTime Frontend

## Code Organization

- Code intended for base stations belongs in the `base-station` folder.
- Code intended for the command center belongs in the `command-center` folder.

## Run with Docker

Build the production image:

```bash
docker build -t light-time-frontend .
```

Start the application at <http://localhost:8080>:

```bash
docker run --rm -p 8080:8080 light-time-frontend
```

## Deploy to Google Cloud Run

Cloud Run provides the `PORT` environment variable at runtime. The image
defaults to port `8080`, binds to all interfaces, and runs as a non-root user.

Deploy directly from the repository with Cloud Build:

```bash
gcloud run deploy light-time-frontend \
  --source . \
  --region REGION \
  --allow-unauthenticated
```

Replace `REGION` with the Cloud Run region to use. The `gcloud` command uses
the repository's `Dockerfile` and Cloud Run routes traffic to the container's
port automatically.
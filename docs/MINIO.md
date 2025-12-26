# MinIO (free S3-compatible storage)

MinIO lets you store product images without any SaaS lock-in.

## Start MinIO with Docker
`docker-compose.prod.yml` includes a `minio` service.

```bash
docker compose -f docker-compose.prod.yml up -d minio
```

Open console:
- http://localhost:9001
Login using:
- MINIO_ROOT_USER / MINIO_ROOT_PASSWORD (from `.env`)

## Create a bucket
Create bucket: `chainchik`

## Switch app to S3 mode
In `.env`:
```env
FILE_STORAGE_DRIVER=s3
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=chainchik
S3_PUBLIC_BASE_URL=http://localhost:9000/chainchik
```

Then restart `api`.


## Auto-bucket setup
This stack includes `minio-init` which automatically creates the bucket and sets public download policy.

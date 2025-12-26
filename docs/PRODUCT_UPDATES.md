# Updating products & gallery (no HTML editing)

## Add a product
Go to `/admin/products` → fill SKU, name, price, stock → Add.

## Upload images (free + portable)
1. Go to `/admin/products/<SKU>`
2. Run the curl upload command shown on the page
3. Paste returned URLs (one per line)
4. Save gallery

## Storage
Default: **local** storage in Docker volume (`uploads_data`), served from the API at `/uploads/<key>`.
Optional: S3-compatible (MinIO / Cloudflare R2) by setting `FILE_STORAGE_DRIVER=s3`.


## Drag-and-drop uploads
Go to `/admin/products/<SKU>` and upload images directly in the UI (no curl).

If you want S3-style storage, see `docs/MINIO.md`.

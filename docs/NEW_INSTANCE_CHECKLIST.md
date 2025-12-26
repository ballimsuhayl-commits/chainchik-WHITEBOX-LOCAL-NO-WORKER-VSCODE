# New Business Instance Checklist

## Before you start
- Decide WhatsApp number / Meta app
- Decide payment method: POP / PayFast / Both
- Decide courier: Manual / Courier Guy
- Decide storage: local / MinIO

## Spin up
1. `bash scripts/whitebox/new-business.sh`
2. Open `/admin` and complete `/admin/setup`

## Configure integrations
- Meta: webhook URL + verify token/secret
- Courier Guy: API key (if used)
- PayFast: merchant id/key + ITN passphrase (if used)

## Go-live test
- Add 1 product with 2 images
- Place a test order
- Upload test POP
- Mark checklist complete
- Move status to READY_TO_SHIP (should succeed)
- Confirm tracking page loads: `/track/<orderId>`

# Deployment Guide

## Local Development

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- API health: `http://localhost:4000/health`

## Docker Deployment

```bash
docker compose up --build
```

- Nginx entrypoint: `http://localhost:8080`
- Frontend container: `frontend:3000`
- Backend container: `backend:4000`
- PostgreSQL container: `postgres:5432`

## Required Production Environment Variables

| Variable | Service | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Access token signing key |
| `JWT_REFRESH_SECRET` | Backend | Refresh token signing key |
| `CLIENT_ORIGIN` | Backend | Allowed frontend origin |
| `S3_ENDPOINT` | Backend | S3-compatible endpoint |
| `S3_BUCKET` | Backend | Document bucket |
| `S3_ACCESS_KEY_ID` | Backend | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Backend | Storage secret |
| `SMTP_HOST` | Backend | Email provider host |
| `SMTP_USER` | Backend | Email provider user |
| `SMTP_PASSWORD` | Backend | Email provider password |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Browser API base URL |

## Production Notes

- Terminate TLS at Nginx or cloud load balancer.
- Replace demo JWT secrets before deployment.
- Use managed PostgreSQL with automated backups.
- Use private S3 buckets and signed URLs for downloads.
- Run schema migrations before each release.
- Export audit logs to long-term storage if required by compliance.

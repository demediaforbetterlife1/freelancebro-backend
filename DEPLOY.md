# Deploy FreelancePro Backend to Fly.io

## Prerequisites

1. Install Fly.io CLI:
```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Or download from: https://fly.io/docs/hands-on/install-flyctl/
```

2. Sign up/Login to Fly.io:
```bash
flyctl auth signup
# OR
flyctl auth login
```

## Deployment Steps

### 1. Initialize Fly.io App (First Time Only)

```bash
cd E:\freelance-pro\backend
flyctl launch --no-deploy
```

This will:
- Detect the Dockerfile
- Create `fly.toml` config (already created)
- Ask you to choose an app name (keep: `freelancepro-backend`)
- Choose region: `iad` (US East)

### 2. Set Environment Variables

```bash
# Set DATABASE_URL (Neon PostgreSQL)
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:npg_OiEPWcS9qN2p@ep-green-morning-b45t5mcn-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Set JWT Secret (IMPORTANT: Change this!)
flyctl secrets set JWT_SECRET="your-super-secret-jwt-key-change-this-12345"

# Set Node Environment
flyctl secrets set NODE_ENV="production"

# Optional: Set CORS origin (for mobile app)
flyctl secrets set ALLOWED_ORIGIN="*"
```

### 3. Deploy to Fly.io

```bash
flyctl deploy
```

This will:
- Build the Docker image
- Push to Fly.io registry
- Deploy to production
- Run Prisma migrations automatically

### 4. Check Deployment Status

```bash
# View app status
flyctl status

# View logs
flyctl logs

# Open app in browser
flyctl open
```

### 5. Run Database Migrations

```bash
# SSH into the app
flyctl ssh console

# Run migrations
npx prisma migrate deploy

# Exit SSH
exit
```

## Post-Deployment

### Test the API

```bash
# Health check
curl https://freelancepro-backend.fly.dev/health

# API version
curl https://freelancepro-backend.fly.dev/api/version
```

### Monitor Logs

```bash
# Real-time logs
flyctl logs

# Past logs
flyctl logs --tail 100
```

### Scale Up/Down

```bash
# Scale to 1 machine (free tier)
flyctl scale count 1

# Scale memory
flyctl scale memory 512
```

## Update Mobile App

After deployment, update the mobile app's API URL:

**File: `mobile/eas.json`**

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://freelancepro-backend.fly.dev"
      }
    }
  }
}
```

Then rebuild the mobile app:
```bash
cd E:\freelance-pro\mobile
npx eas-cli build --platform android --profile preview
```

## Troubleshooting

### Check App Status
```bash
flyctl status
```

### View Logs
```bash
flyctl logs
```

### Restart App
```bash
flyctl apps restart
```

### SSH into App
```bash
flyctl ssh console
```

### Update Secrets
```bash
flyctl secrets set KEY=VALUE
```

### Destroy App (Careful!)
```bash
flyctl apps destroy freelancepro-backend
```

## Important URLs

- **App URL:** https://freelancepro-backend.fly.dev
- **Health Check:** https://freelancepro-backend.fly.dev/health
- **Dashboard:** https://fly.io/dashboard
- **Docs:** https://fly.io/docs

## Free Tier Limits

- Up to 3 apps
- 256MB RAM per app
- 1GB persistent storage
- 160GB outbound data transfer/month

## Support

- Fly.io Docs: https://fly.io/docs
- Community: https://community.fly.io

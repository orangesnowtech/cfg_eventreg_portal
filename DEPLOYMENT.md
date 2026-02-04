# Firebase App Hosting Deployment Guide

## Prerequisites

1. **Install Google Cloud SDK (gcloud CLI)**
   - Download from: https://cloud.google.com/sdk/docs/install
   - For Windows: Run the installer and follow the prompts
   - Verify installation: `gcloud --version`

2. **Authenticate with Google Cloud**
   ```bash
   gcloud auth login
   gcloud config set project cfg-event-regportal
   ```

3. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## Step 1: Create Secrets in Google Secret Manager

### Option A: Using PowerShell (Windows)
```powershell
.\setup-secrets.ps1
```

### Option B: Using Bash (Mac/Linux)
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

### Option C: Manual Creation
You can also create secrets manually in the Google Cloud Console:
1. Go to: https://console.cloud.google.com/security/secret-manager?project=cfg-event-regportal
2. Click "CREATE SECRET"
3. Create each of the following secrets:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `ZEPTOMAIL_API_KEY`
   - `ZEPTOMAIL_FROM_EMAIL`
   - `ZEPTOMAIL_FROM_NAME`

## Step 2: Grant Permissions

Grant the Firebase App Hosting service account access to secrets:

```bash
PROJECT_ID="cfg-event-regportal"

# Get the App Hosting service account
gcloud projects describe $PROJECT_ID --format="value(projectNumber)" > project_number.txt
PROJECT_NUMBER=$(cat project_number.txt)
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to each secret
gcloud secrets add-iam-policy-binding FIREBASE_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding FIREBASE_CLIENT_EMAIL \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding FIREBASE_PRIVATE_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding ZEPTOMAIL_API_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding ZEPTOMAIL_FROM_EMAIL \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding ZEPTOMAIL_FROM_NAME \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

## Step 3: Deploy to Firebase App Hosting

### Initialize Firebase App Hosting (first time only)
```bash
firebase init hosting:apphosting
```

Select:
- Choose your GitHub repository: `orangesnowtech/cfg_eventreg_portal`
- Select branch: `live`
- Root directory: (leave empty or enter `.`)

### Deploy to Firebase App Hosting
```bash
# Deploy from live branch
git checkout live
git push origin live

# Firebase will automatically detect the push and deploy
# Monitor deployment at: https://console.firebase.google.com/project/cfg-event-regportal/apphosting
```

### Manual Deployment (if needed)
```bash
firebase apphosting:rollouts:create YOUR_BACKEND_ID --branch live
```

## Step 4: Update Production URL

Once deployed, Firebase will provide you with a URL like:
- `https://YOUR_BACKEND_ID--cfg-event-regportal.web.app`

Update the `NEXT_PUBLIC_APP_URL` in `apphosting.yaml` with your actual deployment URL.

## Step 5: Set Up Custom Domain (Optional)

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `events.cfgafrica.com`)
4. Follow the DNS configuration instructions

## Verifying Deployment

### Check Secrets are Accessible
```bash
gcloud secrets list --project=cfg-event-regportal
```

### View Secret Values (for verification)
```bash
gcloud secrets versions access latest --secret=ZEPTOMAIL_FROM_EMAIL --project=cfg-event-regportal
```

### Check Deployment Status
```bash
firebase apphosting:backends:list
firebase apphosting:rollouts:list YOUR_BACKEND_ID
```

### View Logs
1. Go to: https://console.firebase.google.com/project/cfg-event-regportal/apphosting
2. Select your backend
3. Click "Logs" tab

## Troubleshooting

### Secret Access Issues
If the app can't access secrets:
1. Verify secrets exist: `gcloud secrets list --project=cfg-event-regportal`
2. Check IAM permissions (see Step 2)
3. Ensure service account has `roles/secretmanager.secretAccessor`

### Build Failures
1. Check build logs in Firebase Console
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility (using Node 20)

### Environment Variable Issues
- Public variables (NEXT_PUBLIC_*) are built into the client bundle
- Secret variables are only available server-side
- Never use NEXT_PUBLIC_ prefix for sensitive data

## Continuous Deployment

Firebase App Hosting automatically deploys when you push to the `live` branch:

```bash
# Make changes on master
git checkout master
# ... make changes ...
git add .
git commit -m "Your changes"
git push origin master

# Merge to live and deploy
git checkout live
git merge master
git push origin live
# Firebase automatically deploys!
```

## Monitoring

- **Firebase Console**: https://console.firebase.google.com/project/cfg-event-regportal/apphosting
- **Cloud Build Logs**: https://console.cloud.google.com/cloud-build/builds?project=cfg-event-regportal
- **Secret Manager**: https://console.cloud.google.com/security/secret-manager?project=cfg-event-regportal

## Important Notes

1. **Never commit `.env.local`** - It's in `.gitignore` for security
2. **Secrets are managed in Google Secret Manager** - Update them there, not in code
3. **The `live` branch triggers automatic deployments** - Only merge when ready
4. **Public variables are visible to clients** - Use only for non-sensitive config
5. **Zeptomail keys are SECRET** - They should NEVER have NEXT_PUBLIC_ prefix

## Support

- Firebase App Hosting Docs: https://firebase.google.com/docs/app-hosting
- Secret Manager Docs: https://cloud.google.com/secret-manager/docs
- Next.js Environment Variables: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

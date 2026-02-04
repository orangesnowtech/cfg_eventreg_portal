# Quick Deployment Reference

## 🚀 First Time Setup (One Time Only)

1. **Install gcloud CLI** (if not already installed)
   - Download: https://cloud.google.com/sdk/docs/install
   - Run installer and follow prompts

2. **Authenticate**
   ```powershell
   gcloud auth login
   gcloud config set project cfg-event-regportal
   ```

3. **Create Secrets in Google Secret Manager**
   ```powershell
   # Run from project root
   .\setup-secrets.ps1
   ```

4. **Grant Permissions to App Hosting Service Account**
   ```powershell
   # Get project number
   $PROJECT_ID = "cfg-event-regportal"
   $PROJECT_NUMBER = (gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
   $SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
   
   # Grant access to each secret
   $secrets = @("FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", 
                "ZEPTOMAIL_API_KEY", "ZEPTOMAIL_FROM_EMAIL", "ZEPTOMAIL_FROM_NAME")
   
   foreach ($secret in $secrets) {
       gcloud secrets add-iam-policy-binding $secret `
         --member="serviceAccount:${SERVICE_ACCOUNT}" `
         --role="roles/secretmanager.secretAccessor" `
         --project=$PROJECT_ID
   }
   ```

5. **Initialize Firebase App Hosting**
   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase init hosting:apphosting
   ```
   - Select repository: `orangesnowtech/cfg_eventreg_portal`
   - Branch: `live`
   - Root directory: `.` (or leave empty)

## 📦 Regular Deployment Workflow

### Making Changes
```powershell
# Work on master branch
git checkout master

# Make your changes...

# Commit changes
git add .
git commit -m "Description of changes"
git push origin master
```

### Deploy to Production
```powershell
# Merge to live branch (triggers automatic deployment)
git checkout live
git merge master
git push origin live

# Firebase App Hosting will automatically:
# 1. Detect the push to 'live' branch
# 2. Build the application
# 3. Deploy to production
```

### Monitor Deployment
- Firebase Console: https://console.firebase.google.com/project/cfg-event-regportal/apphosting
- Check deployment status and logs

## 🔧 Common Tasks

### Update a Secret
```powershell
# Example: Update Zeptomail API key
echo "new-api-key-value" | gcloud secrets versions add ZEPTOMAIL_API_KEY --data-file=-
```

### View Current Secrets
```powershell
gcloud secrets list --project=cfg-event-regportal
```

### View Secret Value
```powershell
gcloud secrets versions access latest --secret=ZEPTOMAIL_API_KEY --project=cfg-event-regportal
```

### Check Deployment Status
```powershell
firebase apphosting:backends:list
```

### View Application Logs
Go to: https://console.firebase.google.com/project/cfg-event-regportal/apphosting
- Select your backend
- Click "Logs" tab

## ⚠️ Important Notes

- ✅ **Only push to `live` when ready to deploy** - It triggers automatic deployment
- ✅ **Secrets are managed in Google Secret Manager** - Update them there, not in code
- ✅ **Never commit `.env.local`** - It's already in .gitignore
- ✅ **Test on `master` before merging to `live`**
- ❌ **Never use `NEXT_PUBLIC_` prefix for secrets** - They would be exposed to clients

## 🔍 Troubleshooting

### Build fails
1. Check logs in Firebase Console
2. Verify all dependencies in package.json
3. Test build locally: `npm run build`

### Can't access secrets
1. Verify secrets exist: `gcloud secrets list`
2. Check service account has permissions (Step 4 above)
3. View deployment logs for error messages

### Environment variables not working
- Public vars (NEXT_PUBLIC_*): Available everywhere, baked into client bundle
- Secret vars: Server-side only, never exposed to client
- Verify spelling matches exactly in apphosting.yaml

## 📞 Support Resources

- Full deployment guide: See `DEPLOYMENT.md`
- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- Secret Manager: https://cloud.google.com/secret-manager/docs

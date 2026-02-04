# CFG Africa Event Registration Portal - Setup Guide

## 🚀 Quick Start

Your event management system is ready! Follow these steps to get it running:

### 1. Environment Variables

Copy the `.env.local.example` file to `.env.local`:

```bash
cp .env.local.example .env.local
```

Then fill in your credentials:

#### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project
3. Go to Project Settings → General
4. Under "Your apps", find your web app config
5. Copy the values to your `.env.local`

#### Firebase Admin SDK
1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Copy these values to `.env.local`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (keep the quotes and newlines: `"-----BEGIN PRIVATE KEY-----\n...`)

#### Zeptomail Setup
1. Sign up at [Zeptomail](https://www.zoho.com/zeptomail/)
2. Verify your domain
3. Generate API key
4. Add to `.env.local`

### 2. Deploy Firestore Security Rules

```bash
# Install Firebase CLI globally (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📱 Application Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/` | Public registration form | Everyone |
| `/check-in` | Staff check-in interface | Event staff |
| `/admin` (coming soon) | Admin dashboard | Authenticated admins |

---

## 🔐 Security Checklist

- [ ] Environment variables configured
- [ ] Firebase security rules deployed
- [ ] Zeptomail domain verified
- [ ] `.env.local` added to `.gitignore` (done by default)
- [ ] Admin authentication enabled in Firebase

---

## 🧪 Testing the System

### Test Registration Flow:
1. Navigate to `http://localhost:3000`
2. Fill out the registration form
3. Check Firestore for the new document
4. Check email for confirmation (requires Zeptomail setup)

### Test Check-in Flow:
1. Navigate to `http://localhost:3000/check-in`
2. Enter a valid 6-digit access code
3. Click "Search"
4. Verify guest details
5. Click "Confirm Check-in"
6. Verify the timestamp is recorded

---

## 📊 Firestore Data Structure

```
guests (collection)
  └── {documentId}
      ├── firstName: string
      ├── lastName: string
      ├── email: string
      ├── phone: string
      ├── linkedinUrl: string
      ├── organization: string
      ├── jobTitle: string
      ├── guestType: string
      ├── howDidYouHear: string
      ├── accessCode: string (6 chars, unique)
      ├── checkedIn: boolean
      ├── registeredAt: timestamp
      └── checkedInAt: timestamp | null
```

---

## 🎯 Next Steps

1. **Test locally** - Make sure registration and check-in work
2. **Deploy to Vercel** - Connect your GitHub repo and deploy
3. **Configure production** - Update environment variables in Vercel
4. **Share registration link** - Give guests the public URL
5. **Prepare for event** - Test check-in flow on mobile devices

---

## 🚨 Troubleshooting

### "Firebase not initialized" error
- Check that all Firebase env variables are set
- Verify the private key has proper quotes and newlines

### Email not sending
- Verify Zeptomail API key is correct
- Check domain verification status
- Review Zeptomail dashboard for errors

### Check-in search not working
- Ensure Firestore security rules are deployed
- Check that documents are being created with access codes
- Verify API routes are working (`/api/check-in/search`)

### Styling issues
- Make sure Tailwind CSS is properly configured
- Check `tailwind.config.ts` for proper content paths

---

## 📞 Support

For issues or questions:
- Email: events@cfgafrica.com
- Review the README.md for detailed documentation

---

## ✨ Features Implemented

✅ Public registration form with validation  
✅ Unique access code generation  
✅ Email confirmation system  
✅ Staff check-in interface  
✅ Duplicate check-in prevention  
✅ Mobile-optimized design  
✅ Firestore security rules  
✅ Real-time search functionality  

### Coming Soon

⏳ Admin dashboard  
⏳ Real-time analytics  
⏳ QR code generation  
⏳ CSV export  
⏳ SMS notifications  

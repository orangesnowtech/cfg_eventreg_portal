# 🚀 QUICK START GUIDE

## Get Running in 3 Steps

### Step 1: Environment Variables
```bash
cp .env.local.example .env.local
# Then edit .env.local with your Firebase & Zeptomail credentials
```

### Step 2: Deploy Security Rules
```bash
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

### Step 3: Run
```bash
npm run dev
# Visit http://localhost:3000
```

---

## URLs

| Route | Purpose |
|-------|---------|
| `/` | Public Registration |
| `/check-in` | Staff Check-in |

---

## Credentials Needed

### Firebase Console → Project Settings
- ✅ Web app config (API key, etc.)
- ✅ Service account JSON (private key)

### Zeptomail Dashboard
- ✅ API key
- ✅ Verified domain

---

## Test Flow

1. **Register** at `/`
2. **Check email** for access code
3. **Check-in** at `/check-in` using code
4. **Verify** in Firestore console

---

## Event Day Checklist

- [ ] Staff devices have `/check-in` bookmarked
- [ ] Internet connection confirmed
- [ ] Backup guest list printed
- [ ] Tech support contact ready

---

## Need Help?

See **LAUNCH_CHECKLIST.md** for complete guide
See **SETUP.md** for detailed setup
See **README.md** for full documentation

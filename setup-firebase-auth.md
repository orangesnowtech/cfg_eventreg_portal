# Firebase Authentication Setup Guide

## Issue: auth/network-request-failed

This error occurs because Firebase Authentication requires your production domain to be authorized.

## Solution: Add Authorized Domain

### Option 1: Firebase Console (Quick)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **cfg-event-regportal**
3. Go to **Authentication** → **Settings** tab
4. Scroll to **Authorized domains** section
5. Click **Add domain**
6. Add: `events.cfgafrica.com`
7. Click **Add**

### Option 2: Firebase CLI

Run this command:

```bash
firebase auth:export --project cfg-event-regportal
```

Then add the domain through the console as Firebase CLI doesn't support adding authorized domains directly.

## Current Configuration

Based on the Firebase SDK config:

- **Project ID**: cfg-event-regportal
- **Auth Domain**: cfg-event-regportal.firebaseapp.com
- **API Key**: AIzaSyC3762Bk_ORisX7lORyBJ_-HHDvM-qI_24

## Default Authorized Domains

Firebase automatically includes:
- `localhost` (for local development)
- `cfg-event-regportal.firebaseapp.com` (default Firebase hosting)

## Required Additional Domain

You need to manually add:
- `events.cfgafrica.com` (your production domain)

## Verify Setup

After adding the domain, try logging in again at:
https://events.cfgafrica.com/admin

The login should work without the network error.

## Create Admin User

If you don't have an admin user yet:

1. Go to Firebase Console
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Enter:
   - Email: `admin@cfgafrica.com`
   - Password: (your secure password)
5. Click **Add User**

Now you can log in with those credentials.

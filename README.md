# CFG Africa Event Registration Portal

A professional-grade event management system built with Next.js, Firebase, and Zeptomail for managing event registrations and guest check-ins.

##  Features

### Public Registration Form
- Responsive, mobile-friendly design
- Real-time form validation with Zod
- Automatic unique 6-digit access code generation
- Email confirmation with access code
- Professional gradient UI with Tailwind CSS

### Staff Check-In System
- Mobile-optimized check-in interface
- Search by access code or last name
- Real-time guest lookup
- Visual feedback for successful check-ins
- Duplicate check-in prevention with warnings
- Displays check-in history and timestamps

### Admin Dashboard (Coming Soon)
- Protected table view of all guests
- Advanced filtering and search
- Export to CSV/PDF
- Real-time statistics

##  Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Email:** Zeptomail
- **Validation:** Zod
- **Forms:** React Hook Form
- **Icons:** Lucide React

##  Installation & Setup

### 1. Install Dependencies

\\\ash
npm install
\\\

### 2. Configure Environment Variables

Create a \.env.local\ file in the root directory:

\\\env
# Firebase Client Config (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side only - KEEP SECRET)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"

# Zeptomail Configuration
ZEPTOMAIL_API_KEY=your_zeptomail_api_key
ZEPTOMAIL_FROM_EMAIL=noreply@cfgafrica.com
ZEPTOMAIL_FROM_NAME=CFG Africa Events

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
\\\

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Firestore Database
4. Enable Authentication (Email/Password)
5. Generate service account key:
   - Go to Project Settings  Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

6. Deploy Firestore Security Rules:

\\\ash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
\\\

### 4. Zeptomail Setup

1. Sign up at [Zeptomail](https://www.zoho.com/zeptomail/)
2. Verify your sending domain
3. Generate an API key from the dashboard
4. Add the API key to your \.env.local\ file

### 5. Run Development Server

\\\ash
npm run dev
\\\

Visit [http://localhost:3000](http://localhost:3000)

##  Project Structure

\\\
event-reg-portal/
 app/
    api/
       register/          # Registration endpoint
       check-in/
          search/        # Search guest endpoint
          confirm/       # Confirm check-in endpoint
       send-confirmation/ # Email sending endpoint
    page.tsx               # Public registration form
    check-in/
        page.tsx           # Staff check-in interface
 components/
    RegistrationForm.tsx   # Public registration component
    CheckInForm.tsx        # Staff check-in component
 lib/
    firebase/
       client.ts          # Firebase client config
       admin.ts           # Firebase admin config
    validations/
        registration.ts    # Zod validation schemas
 types/
    guest.ts               # TypeScript interfaces
 firestore.rules            # Firestore security rules
 .env.local.example         # Environment variables template
 package.json
\\\

##  Security

### Firestore Security Rules

The app implements strict security rules:

- **Public users:** Can only CREATE guest documents (no read access)
- **Authenticated admins:** Full read/write/update/delete access
- **Validation:** All fields are validated at the database level
- **No direct database access:** All operations go through API routes

##  Usage

### For Event Organizers

1. **Registration:** Share the public registration URL
2. **Check-in:** Access /check-in on event day
3. **Search:** Enter access code or last name
4. **Confirm:** Click "Confirm Check-In" button

### For Guests

1. Fill out the registration form
2. Receive confirmation email with access code
3. Bring access code to the event
4. Get checked in by staff

##  Access Codes

- **Format:** 6-character alphanumeric (e.g., A3K7P2)
- **Characters used:** A-Z, 2-9 (excludes similar-looking 0, O, I, 1)
- **Uniqueness:** Automatically verified before creation
- **Delivery:** Sent via email immediately after registration

##  Email Notifications

Automated emails include:
- Welcome message
- Large, prominent access code
- Registration details
- Event information
- Contact details

##  Coming Soon

- [ ] Admin dashboard
- [ ] Real-time analytics
- [ ] QR code generation for access codes
- [ ] Bulk import/export
- [ ] SMS notifications
- [ ] Guest badge printing

##  License

 2026 CFG Africa. All rights reserved.

##  Support

For questions or issues, contact: events@cfgafrica.com

// TypeScript interfaces for the Event Registration Portal

export type GuestType = 
  | "Active Client"
  | "Prospective Client"
  | "Visitor"
  | "Friend of the House"
  | "Media/Press"
  | "Organizer";

export type HowDidYouHear = 
  | "Social Media"
  | "Email"
  | "Friend/Colleague"
  | "Website"
  | "Event Partner"
  | "Other";

export interface Guest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  socialMediaUrl?: string;
  organizationName: string;
  jobTitle: string;
  guestType: GuestType;
  howDidYouHear: HowDidYouHear;
  accessCode: string;
  checkedIn: boolean;
  registeredAt: Date | string;
  checkedInAt: Date | string | null;
}

export interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  socialMediaUrl?: string;
  organizationName: string;
  jobTitle: string;
  guestType: GuestType;
  howDidYouHear: HowDidYouHear;
}

export interface CheckInSearchResult {
  found: boolean;
  guest?: Guest & { id: string };
  message?: string;
}

export interface CheckInConfirmResult {
  success: boolean;
  message: string;
  checkedInAt?: Date;
}

// Admin User Interface
export type AdminRole = "admin" | "super_admin";

export interface AdminUser {
  id?: string;
  email: string;
  displayName: string;
  role: AdminRole;
  createdAt: Date | string;
  createdBy?: string; // Email of super admin who created this user
  lastLoginAt?: Date | string | null;
}

// Activity Log Interface
export type ActivityType = "registration" | "check_in" | "admin_created" | "admin_login";

export interface ActivityLog {
  id?: string;
  type: ActivityType;
  performedBy: string; // Email of admin or "system"
  targetGuest?: string; // Guest ID or email
  targetAdmin?: string; // Admin email (for admin_created)
  details: string;
  timestamp: Date | string;
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to format guest name
export function formatGuestName(guest: Guest | (Guest & { id: string })): string {
  return `${guest.firstName} ${guest.lastName}`;
}

// Helper function to format timestamp
export function formatTimestamp(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

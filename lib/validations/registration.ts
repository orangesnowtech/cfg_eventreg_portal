import { z } from 'zod';

/**
 * Zod Schema for Registration Form Validation
 * Ensures all required fields are properly validated before submission
 */
export const registrationSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase(),
  
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Please enter a valid phone number'),
  
  socialMediaUrl: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')), // Allow empty string
  
  organizationName: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
  
  jobTitle: z.string()
    .min(2, 'Job title must be at least 2 characters')
    .max(100, 'Job title must be less than 100 characters'),
  
  guestType: z.enum([
    'Active Client',
    'Prospective Client',
    'Visitor',
    'Friend of the House',
    'Media/Press',
    'Organizer',
    'Partner',
    'Staff',
    'Vendor'
  ], {
    message: 'Please select a valid guest type'
  }),
  
  howDidYouHear: z.enum([
    'Social Media',
    'Email',
    'Friend/Colleague',
    'Website',
    'Event Partner',
    'Word of Mouth',
    'Other'
  ], {
    message: 'Please select how you heard about this event'
  })
});

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

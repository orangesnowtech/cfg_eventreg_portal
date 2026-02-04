'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationFormValues } from '@/lib/validations/registration';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormValues) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    setAccessCode('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      setSubmitStatus('success');
      setAccessCode(result.accessCode);
      reset();
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Message - Only show this when successful */}
      {submitStatus === 'success' ? (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Signature Line */}
          <div className="cfg-signature-line"></div>
          
          <div className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#E0FAF4' }}>
                <CheckCircle className="h-10 w-10" style={{ color: '#27D2A9' }} />
              </div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>
                Registration Successful! 🎉
              </h2>
              <p className="text-lg" style={{ color: '#666' }}>
                You&apos;re all set for the CFG Africa event!
              </p>
            </div>

            {/* Access Code Display */}
            <div className="rounded-xl p-6 mb-8" style={{ 
              background: 'linear-gradient(135deg, #E0FAF4 0%, #58C8E7 100%)',
              border: '2px solid #27D2A9'
            }}>
              <p className="text-sm font-semibold mb-2 text-center" style={{ color: '#092358' }}>
                YOUR ACCESS CODE
              </p>
              <p className="text-5xl font-bold tracking-widest font-mono text-center mb-2" style={{ color: '#092358' }}>
                {accessCode}
              </p>
              <p className="text-xs text-center" style={{ color: '#666' }}>
                Save this code - you&apos;ll need it for check-in
              </p>
            </div>

            {/* Event Information */}
            <div className="space-y-6 mb-8">
              <div className="pl-4" style={{ borderLeft: '4px solid #27D2A9' }}>
                <h3 className="font-semibold mb-2" style={{ color: '#092358' }}>What&apos;s Next?</h3>
                <ul className="space-y-2" style={{ color: '#333' }}>
                  <li className="flex items-start">
                    <span className="mr-2" style={{ color: '#27D2A9' }}>✓</span>
                    <span>Check your email for confirmation and event details</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2" style={{ color: '#27D2A9' }}>✓</span>
                    <span>Save your access code: <strong className="font-mono">{accessCode}</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2" style={{ color: '#27D2A9' }}>✓</span>
                    <span>Bring your access code to the event for quick check-in</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: '#E0FAF4' }}>
                <h3 className="font-semibold mb-4 text-lg" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>
                  Event Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1" style={{ color: '#092358' }}>
                      CFG Africa Non-Interest Investment Forum
                    </p>
                    <p className="italic" style={{ color: '#58C8E7' }}>
                      Shaping the Future of Ethical Investments
                    </p>
                  </div>
                  <div className="border-t pt-3" style={{ borderColor: '#27D2A9' }}>
                    <p className="mb-2" style={{ color: '#333' }}>
                      <strong>Focus:</strong> Opportunities for Non Interest Investors in Nigeria
                    </p>
                  </div>
                  <div className="border-t pt-3 space-y-2" style={{ borderColor: '#27D2A9' }}>
                    <p style={{ color: '#333' }}><strong>📍 Venue:</strong> Nordic Hotel, Jabi, Abuja</p>
                    <p style={{ color: '#333' }}><strong>📅 Date:</strong> Thursday, February 5, 2026</p>
                    <p style={{ color: '#333' }}><strong>🕙 Time:</strong> 10:00 AM</p>
                  </div>
                  <div className="border-t pt-3 space-y-1" style={{ borderColor: '#27D2A9' }}>
                    <p style={{ color: '#333' }}>
                      <strong>Website:</strong>{' '}
                      <a href="https://cfgafrica.com" className="hover:underline" style={{ color: '#58C8E7' }}>
                        cfgafrica.com
                      </a>
                    </p>
                    <p style={{ color: '#333' }}>
                      <strong>Contact:</strong>{' '}
                      <a href="mailto:events@cfgafrica.com" className="hover:underline" style={{ color: '#58C8E7' }}>
                        events@cfgafrica.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setSubmitStatus('idle');
                  setAccessCode('');
                }}
                className="flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium"
                style={{ backgroundColor: '#092358' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a2a6e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#092358'}
              >
                Register Another Guest
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium"
                style={{ backgroundColor: '#27D2A9' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#22b890'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#27D2A9'}
              >
                Print Confirmation
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="mb-6 p-4 rounded-lg flex items-start" style={{ 
              backgroundColor: '#fff5f7', 
              border: '2px solid #FF5271' 
            }}>
              <AlertCircle className="h-6 w-6 mr-3 shrink-0 mt-0.5" style={{ color: '#FF5271' }} />
              <div>
                <h3 className="font-semibold text-lg" style={{ color: '#FF5271' }}>
                  Registration Failed
                </h3>
                <p className="text-sm mt-1" style={{ color: '#d43f5a' }}>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Registration Form - Only show when not successful */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-xl rounded-lg overflow-hidden">
            {/* Signature Line */}
            <div className="cfg-signature-line"></div>
            
            <div className="p-8">
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b" style={{ 
                    color: '#092358',
                    fontFamily: 'Georgia, serif',
                    borderColor: '#27D2A9'
                  }}>
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    First Name <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    id="firstName"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    Last Name <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    id="lastName"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    Email Address <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    Phone Number <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    id="phone"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="+1234567890"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="socialMediaUrl" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    LinkedIn / Social Media URL
                  </label>
                  <input
                    {...register('socialMediaUrl')}
                    type="url"
                    id="socialMediaUrl"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                  {errors.socialMediaUrl && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.socialMediaUrl.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b" style={{ 
                color: '#092358',
                fontFamily: 'Georgia, serif',
                borderColor: '#27D2A9'
              }}>
                Professional Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    Organization Name <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <input
                    {...register('organizationName')}
                    type="text"
                    id="organizationName"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="Acme Corporation"
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.organizationName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    Job Title <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <input
                    {...register('jobTitle')}
                    type="text"
                    id="jobTitle"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="Senior Manager"
                  />
                  {errors.jobTitle && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.jobTitle.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Event Specific Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b" style={{ 
                color: '#092358',
                fontFamily: 'Georgia, serif',
                borderColor: '#27D2A9'
              }}>
                Event Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="guestType" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    Guest Type <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <select
                    {...register('guestType')}
                    id="guestType"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition bg-white"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  >
                    <option value="">Select guest type</option>
                    <option value="Active Client">Active Client</option>
                    <option value="Prospective Client">Prospective Client</option>
                    <option value="Visitor">Visitor</option>
                    <option value="Friend of the House">Friend of the House</option>
                    <option value="Media/Press">Media/Press</option>
                    <option value="Organizer">Organizer</option>
                  </select>
                  {errors.guestType && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.guestType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="howDidYouHear" className="block text-sm font-medium mb-2" style={{ color: '#092358' }}>
                    How did you hear about this event? <span style={{ color: '#FF5271' }}>*</span>
                  </label>
                  <textarea
                    {...register('howDidYouHear')}
                    id="howDidYouHear"
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg outline-none transition resize-none"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="e.g., LinkedIn, Email invitation, Word of mouth..."
                  />
                  {errors.howDidYouHear && (
                    <p className="mt-1 text-sm" style={{ color: '#FF5271' }}>
                      {errors.howDidYouHear.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
                style={{ 
                  backgroundColor: isSubmitting ? '#58C8E7' : '#092358',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#0a2a6e')}
                onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#092358')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Registering...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm" style={{ color: '#666' }}>
          <p>© 2026 CFG Africa. All rights reserved.</p>
          <p className="mt-1">
            Questions? Contact us at{' '}
            <a href="mailto:events@cfgafrica.com" className="hover:underline" style={{ color: '#58C8E7' }}>
              events@cfgafrica.com
            </a>
          </p>
        </div>
        </>
      )}
    </div>
  );
}

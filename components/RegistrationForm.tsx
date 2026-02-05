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

    console.log('Submitting registration data:', data);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('Registration response:', { status: response.status, result });

      if (!response.ok) {
        console.error('Registration failed:', result);
        
        // Show detailed validation errors if available
        if (result.details && Array.isArray(result.details)) {
          const errorDetails = result.details.map((err: { path: string[]; message: string }) => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          throw new Error(`${result.error}\n\nDetails: ${errorDetails}`);
        }
        
        throw new Error(result.error || 'Registration failed');
      }

      console.log('Registration successful!', result);
      setSubmitStatus('success');
      setAccessCode(result.accessCode);
      reset();
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred during registration. Please try again.');
      
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
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
          {/* Signature Line */}
          <div className="cfg-signature-line"></div>
          
          <div className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-[#E0FAF4] dark:bg-[#1e293b]">
                <CheckCircle className="h-10 w-10 text-[#27D2A9]" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-[#092358] dark:text-blue-400" style={{ fontFamily: 'Georgia, serif' }}>
                Registration Successful! 🎉
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                You&apos;re all set for the CFG Africa event!
              </p>
            </div>

            {/* Access Code Display */}
            <div className="rounded-xl p-6 mb-8 bg-gradient-to-br from-[#E0FAF4] to-[#58C8E7] dark:from-gray-700 dark:to-gray-600 border-2 border-[#27D2A9]">
              <p className="text-sm font-semibold mb-2 text-center text-[#092358] dark:text-blue-400">
                YOUR ACCESS CODE
              </p>
              <p className="text-5xl font-bold tracking-widest font-mono text-center mb-2 text-[#092358] dark:text-blue-400">
                {accessCode}
              </p>
              <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                Save this code - you&apos;ll need it for check-in
              </p>
            </div>

            {/* Event Information */}
            <div className="space-y-6 mb-8">
              <div className="pl-4 border-l-4 border-[#27D2A9]">
                <h3 className="font-semibold mb-2 text-[#092358] dark:text-blue-400">What&apos;s Next?</h3>
                <ul className="space-y-2 text-gray-800 dark:text-gray-200">
                  <li className="flex items-start">
                    <span className="mr-2 text-[#27D2A9]">✓</span>
                    <span>Check your email for confirmation and event details</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-[#27D2A9]">✓</span>
                    <span>Save your access code: <strong className="font-mono">{accessCode}</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-[#27D2A9]">✓</span>
                    <span>Bring your access code to the event for quick check-in</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg p-6 bg-[#E0FAF4] dark:bg-gray-700">
                <h3 className="font-semibold mb-4 text-lg" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>
                  Event Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1 text-[#092358] dark:text-blue-400">
                      CFG Africa Non-Interest Investment Forum
                    </p>
                    <p className="italic text-[#58C8E7]">
                      Shaping the Future of Ethical Investments
                    </p>
                  </div>
                  <div className="border-t pt-3 border-[#27D2A9]">
                    <p className="mb-2 text-gray-800 dark:text-gray-200">
                      <strong>Focus:</strong> Opportunities for Non Interest Investors in Nigeria
                    </p>
                  </div>
                  <div className="border-t pt-3 space-y-2 border-[#27D2A9]">
                    <p className="text-gray-800 dark:text-gray-200"><strong>📍 Venue:</strong> Nordic Hotel, Jabi, Abuja</p>
                    <p className="text-gray-800 dark:text-gray-200"><strong>📅 Date:</strong> Thursday, February 5, 2026</p>
                    <p className="text-gray-800 dark:text-gray-200"><strong>🕙 Time:</strong> 10:00 AM</p>
                  </div>
                  <div className="border-t pt-3 space-y-1 border-[#27D2A9]">
                    <p className="text-gray-800 dark:text-gray-200">
                      <strong>Website:</strong>{' '}
                      <a href="https://cfgafrica.com" className="hover:underline text-[#58C8E7]">
                        cfgafrica.com
                      </a>
                    </p>
                    <p className="text-gray-800 dark:text-gray-200">
                      <strong>Contact:</strong>{' '}
                      <a href="mailto:events@cfgafrica.com" className="hover:underline text-[#58C8E7]">
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
              <AlertCircle className="h-6 w-6 mr-3 shrink-0 mt-0.5 text-[#FF5271] dark:text-red-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-[#FF5271] dark:text-red-400">
                  Registration Failed
                </h3>
                <p className="text-sm mt-1 whitespace-pre-wrap text-red-600 dark:text-red-400">
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
                  <h2 className="text-2xl font-semibold mb-4 text-[#092358] dark:text-blue-400 border-b-2 border-[#27D2A9] pb-2" style={{
                    fontFamily: 'Georgia, serif'
                  }}>
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-[#092358] dark:text-gray-200">
                    First Name <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    id="firstName"
                    className="cfg-input"
                    placeholder="Adebayo"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    Last Name <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    id="lastName"
                    className="cfg-input"
                    placeholder="Okafor"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    Email Address <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className="cfg-input"
                    placeholder="adebayo.okafor@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    Phone Number <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    id="phone"
                    className="cfg-input"
                    placeholder="+2348012345678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="socialMediaUrl" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    LinkedIn / Social Media URL
                  </label>
                  <input
                    {...register('socialMediaUrl')}
                    type="url"
                    id="socialMediaUrl"
                    className="cfg-input"
                    placeholder="https://linkedin.com/in/adebayookafor"
                  />
                  {errors.socialMediaUrl && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
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
                  <label htmlFor="organizationName" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    Organization Name <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <input
                    {...register('organizationName')}
                    type="text"
                    id="organizationName"
                    className="cfg-input"
                    placeholder="Nigerian Enterprises Ltd"
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
                      {errors.organizationName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    Job Title <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <input
                    {...register('jobTitle')}
                    type="text"
                    id="jobTitle"
                    className="cfg-input"
                    placeholder="Senior Manager"
                  />
                  {errors.jobTitle && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
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
                  <label htmlFor="guestType" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    Guest Type <span className="text-[#FF5271] dark:text-red-400">*</span>
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
                    <option value="Partner">Partner</option>
                    <option value="Staff">Staff</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                  {errors.guestType && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
                      {errors.guestType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="howDidYouHear" className="block text-sm font-medium mb-2 text-[#092358] dark:text-blue-400">
                    How did you hear about this event? <span className="text-[#FF5271] dark:text-red-400">*</span>
                  </label>
                  <select
                    {...register('howDidYouHear')}
                    id="howDidYouHear"
                    className="w-full px-4 py-2 border rounded-lg outline-none transition bg-white"
                    style={{ borderColor: '#d1d5db' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#27D2A9'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  >
                    <option value="">Select an option</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Email">Email</option>
                    <option value="Friend/Colleague">Friend/Colleague</option>
                    <option value="Website">Website</option>
                    <option value="Event Partner">Event Partner</option>
                    <option value="Word of Mouth">Word of Mouth</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.howDidYouHear && (
                    <p className="mt-1 text-sm text-[#FF5271] dark:text-red-400">
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
            <a href="mailto:events@cfgafrica.com" className="hover:underline text-[#58C8E7]">
              events@cfgafrica.com
            </a>
          </p>
        </div>
        </>
      )}
    </div>
  );
}






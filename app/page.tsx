import RegistrationForm from "@/components/RegistrationForm";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#E0FAF4' }}>
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm" style={{ borderColor: '#27D2A9' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center text-center gap-3">
            <Image 
              src="/cfg-logo.png" 
              alt="CFG Africa" 
              width={150} 
              height={150}
              className="object-contain"
            />
            
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/check-in"
              className="text-sm font-medium transition-colors"
              style={{ color: '#27D2A9' }}
            >
              Staff Check-in
            </Link>
            <Link 
              href="/admin"
              className="text-sm font-medium transition-colors"
              style={{ color: '#092358' }}
            >
              Admin →
            </Link>
          </div>
        </div>
        {/* Signature Line */}
        <div className="cfg-signature-line"></div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>
            Register for Our Event
          </h2>
          <p className="text-lg" style={{ color: '#333' }}>
            Join us for an exclusive experience. Fill out the form below to secure your spot
            and receive your unique access code.
          </p>
        </div>

        {/* Registration Form */}
        <div className="max-w-2xl mx-auto">
          <RegistrationForm />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>© 2026 CFG Africa. All rights reserved.</p>
          <p className="mt-2">
            Questions? Contact us at{" "}
            <a href="mailto:events@cfgafrica.com" className="text-blue-600 hover:underline">
              events@cfgafrica.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

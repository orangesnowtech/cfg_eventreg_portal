import CheckInForm from "@/components/CheckInForm";
import Link from "next/link";
import Image from "next/image";

export default function CheckInPage() {
  return (
    <div className="min-h-screen" style={{ background: '#E0FAF4' }}>
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm" style={{ borderColor: '#27D2A9' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/cfg-logo.png" 
              alt="CFG Africa" 
              width={150} 
              height={150}
              className="object-contain"
            />
            
          </div>
          <Link 
            href="/"
            className="text-sm font-medium transition-colors"
            style={{ color: '#27D2A9' }}
          >
            ← Back to Registration
          </Link>
        </div>
        {/* Signature Line */}
        <div className="cfg-signature-line"></div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Info Banner */}
          <div className="mb-8 p-4 rounded-lg" style={{ background: 'rgba(87, 210, 169, 0.1)', border: '1px solid #27D2A9' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>
              Staff Check-in Instructions
            </h2>
            <ul className="text-sm space-y-1" style={{ color: '#333' }}>
              <li>• Search using the 6-digit access code or guest&apos;s last name</li>
              <li>• Verify guest details before confirming check-in</li>
              <li>• System prevents duplicate check-ins automatically</li>
              <li>• Check-in timestamp is recorded for each guest</li>
            </ul>
          </div>

          {/* Check-in Form */}
          <CheckInForm />

          {/* Quick Stats (Optional - can be enhanced later) */}
          <div className="mt-8 p-6 bg-white rounded-lg border" style={{ borderColor: '#27D2A9' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>Quick Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" style={{ color: '#333' }}>
              <div>
                <strong style={{ color: '#092358' }}>Access Code Format:</strong>
                <p>6 characters (e.g., A3K7P2)</p>
              </div>
              <div>
                <strong style={{ color: '#092358' }}>Search Options:</strong>
                <p>Access code or last name</p>
              </div>
              <div>
                <strong style={{ color: '#092358' }}>Already Checked In:</strong>
                <p>Yellow warning with timestamp</p>
              </div>
              <div>
                <strong style={{ color: '#092358' }}>Success State:</strong>
                <p>Large green confirmation</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>© 2026 CFG Africa Event Management System</p>
        </div>
      </footer>
    </div>
  );
}

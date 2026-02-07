'use client';

import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Suspense } from 'react';

function QRDisplayContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No QR Code Data</h1>
          <p className="text-gray-600">Please generate a QR code from the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="flex flex-col items-center">
        {/* QR Code with GDG Logo */}
        <div className="p-8 bg-white rounded-2xl shadow-lg">
          <QRCodeSVG
            value={url}
            size={480}
            level="H"
            includeMargin
            imageSettings={{
              src: "/gdg.ico",
              height: 96,
              width: 96,
              excavate: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function QRDisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">Loading QR Code...</p>
        </div>
      </div>
    }>
      <QRDisplayContent />
    </Suspense>
  );
}

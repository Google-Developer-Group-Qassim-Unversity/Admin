'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import type { ReactNode } from 'react';

const MINIMAL_ROUTES = ['/qr-display'];

export function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't render navbar for minimal routes
  if (MINIMAL_ROUTES.includes(pathname)) {
    return null;
  }
  
  return <Navbar />;
}

export function ConditionalWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap minimal routes with container
  if (MINIMAL_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }
  
  return <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>;
}

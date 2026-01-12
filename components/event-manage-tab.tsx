'use client';

import { useState, useEffect } from 'react';
import { GoogleConnectItem } from '@/components/google-connect-item';
import { FormsCopyItem } from '@/components/forms-copy-item';
import { PublishItem } from '@/components/publish-item';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Event } from '@/lib/api-types';

interface EventManageTabProps {
  event: Event;
}

export function EventManageTab({ event }: EventManageTabProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      setUser(data.user || null);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Google Integration & Publishing</CardTitle>
        <CardDescription>
          Connect your Google account to manage drive files and publish the event form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleConnectItem 
          isAuthenticated={isAuthenticated} 
          user={user} 
          isLoading={isLoading}
          onAuthChange={checkAuth}
        />
        <FormsCopyItem isAuthenticated={isAuthenticated} />
        <PublishItem isAuthenticated={isAuthenticated} />
      </CardContent>
    </Card>
  );
}
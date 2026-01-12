'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleConnectItem } from '@/components/google-connect-item';
import { FormsCopyItem } from '@/components/forms-copy-item';
import { PublishItem } from '@/components/publish-item';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Event } from '@/lib/api-types';

interface EventManageTabProps {
  event: Event;
}

interface FormData {
  id?: number;
  googleFormId: string | null;
  formName: string | null;
}

export function EventManageTab({ event }: EventManageTabProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`/api/auth/status?eventId=${event.id}`);
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
  }, [event.id]);

  const fetchFormData = useCallback(async () => {
    try {
      const res = await fetch(`/api/drive/form?eventId=${event.id}`);
      const data = await res.json();
      if (data.hasForm && data.form) {
        setFormData({
          id: data.form.id,
          googleFormId: data.form.googleFormId,
          formName: data.form.formName,
        });
      } else {
        setFormData(null);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  }, [event.id]);

  useEffect(() => {
    checkAuth();
    fetchFormData();
  }, [checkAuth, fetchFormData]);

  const handleFormChange = () => {
    fetchFormData();
  };

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
          eventId={event.id}
        />
        <FormsCopyItem 
          isAuthenticated={isAuthenticated} 
          eventId={event.id}
          formData={formData}
          onFormChange={handleFormChange}
        />
        <PublishItem isAuthenticated={isAuthenticated} />
      </CardContent>
    </Card>
  );
}
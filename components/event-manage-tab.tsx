'use client';

import { useState, useEffect } from 'react';
import { FormsCopyItem } from '@/components/forms-copy-item';
import { PublishItem } from '@/components/publish-item';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Event } from '@/lib/api-types';

interface EventManageTabProps {
  event: Event;
  onEventChange?: () => void;
}

interface FormData {
  id?: number;
  googleFormId: string | null;
  formName: string | null;
}

export function EventManageTab({ event, onEventChange }: EventManageTabProps) {
  const [user, setUser] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`/api/auth/status?eventId=${event.id}`);
        const data = await res.json();
        setUser(data.user || null);
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      }
    };

    const fetchFormData = async () => {
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
    };

    checkAuth();
    fetchFormData();
  }, [event.id]);

  const handleFormChange = async () => {
    // Refetch form data and auth status
    try {
      const [formRes, authRes] = await Promise.all([
        fetch(`/api/drive/form?eventId=${event.id}`),
        fetch(`/api/auth/status?eventId=${event.id}`)
      ]);
      
      const formDataResult = await formRes.json();
      const authData = await authRes.json();
      
      if (formDataResult.hasForm && formDataResult.form) {
        setFormData({
          id: formDataResult.form.id,
          googleFormId: formDataResult.form.googleFormId,
          formName: formDataResult.form.formName,
        });
      } else {
        setFormData(null);
      }
      
      setUser(authData.user || null);
      
      // Also refresh the event data from parent
      if (onEventChange) {
        onEventChange();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
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
        <FormsCopyItem 
          eventId={event.id}
          formData={formData}
          onFormChange={handleFormChange}
          user={user}
        />
        <PublishItem 
          event={event}
          formData={formData}
          onEventChange={handleFormChange}
        />
      </CardContent>
    </Card>
  );
}
'use client';

import { FormsCopyItem } from '@/components/forms-copy-item';
import { PublishItem } from '@/components/publish-item';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useFormData, useGoogleAuthStatus } from '@/hooks/use-form-data';
import type { Event } from '@/lib/api-types';

interface EventManageTabProps {
  event: Event;
  onEventChange?: () => void;
}

export function EventManageTab({ event, onEventChange }: EventManageTabProps) {
  const { data: formData = null, refetch: refetchForm } = useFormData(event.id);
  console.log('formData in EventManageTab:', formData);
  const { data: user = null, refetch: refetchAuth } = useGoogleAuthStatus(event.id);

  const handleFormChange = async () => {
    await Promise.all([refetchForm(), refetchAuth()]);
    onEventChange?.();
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
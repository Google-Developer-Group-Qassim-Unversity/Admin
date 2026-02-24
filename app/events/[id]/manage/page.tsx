'use client';

import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { FormsCopyItem } from '@/components/forms-copy-item';
import { PublishItem } from '@/components/publish-item';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { useFormData, useGoogleAuthStatus, useUpdateFormType } from '@/hooks/use-form-data';
import { useEventContext } from '@/contexts/event-context';

export default function EventManagePage() {
  const { event, refetch } = useEventContext();
  const { getToken } = useAuth();
  const { data: formData = null, refetch: refetchForm } = useFormData(event?.id ?? 0);
  const { data: user = null, refetch: refetchAuth } = useGoogleAuthStatus(event?.id ?? 0);
  const updateFormType = useUpdateFormType(event?.id ?? 0, getToken);

  if (!event) {
    return null;
  }

  const requiresRegistration = formData?.formType !== 'none';
  const isFormTypeNone = formData?.formType === 'none';

  const handleFormChange = async () => {
    await Promise.all([refetchForm(), refetchAuth()]);
    refetch?.();
  };

  const handleRegistrationToggle = (checked: boolean) => {
    if (!formData) return;

    updateFormType.mutate(
      { formData, requireRegistration: checked },
      {
        onSuccess: () => {
          toast.success(
            checked 
              ? 'Registration is now required for this event' 
              : 'Registration is no longer required'
          );
          handleFormChange();
        },
        onError: (error) => {
          toast.error('Failed to update registration setting', {
            description: error.message,
          });
        },
      }
    );
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
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Require Registration</ItemTitle>
            <ItemDescription>
              {requiresRegistration
                ? 'Members must register to participate in this event'
                : 'Anyone can participate without registration'}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            {updateFormType.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="require-registration"
              checked={requiresRegistration}
              onCheckedChange={handleRegistrationToggle}
              disabled={!formData || updateFormType.isPending}
            />
          </ItemActions>
        </Item>

        <FormsCopyItem 
          eventId={event.id}
          formData={formData}
          onFormChange={handleFormChange}
          user={user}
          disabled={isFormTypeNone}
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

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { GoogleFormsIcon, GoogleIcon } from '@/lib/google-icons';
import { MoreHorizontal, Loader2, ExternalLink, Trash2, Info } from 'lucide-react';
import { getRefreshToken, hasRefreshToken } from '@/lib/google-token-storage';
import { toast } from 'sonner';

interface FormData {
  id?: number;
  googleFormId: string | null;
  formName: string | null;
}

interface FormsCopyItemProps {
  eventId: number;
  formData: FormData | null;
  onFormChange: () => void;
  user?: { name?: string; email?: string; picture?: string } | null;
}

export function FormsCopyItem({ eventId, formData, onFormChange, user }: FormsCopyItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasSavedToken = hasRefreshToken();

  const isCopied = !!formData?.googleFormId;
  const fileName = formData?.formName;
  const fileId = formData?.googleFormId;

  const handleConnect = () => {
    // Check if we have a saved refresh token
    if (hasRefreshToken()) {
      handleCopyWithToken();
    } else {
      // No saved token, go through OAuth flow
      const authUrl = `/api/auth/google?eventId=${eventId}`;
      window.location.href = authUrl;
    }
  };

  const handleCopyWithToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      // Fallback to OAuth if no token
      const authUrl = `/api/auth/google?eventId=${eventId}`;
      window.location.href = authUrl;
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/drive/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to attach form');
      }

      toast.success('Form attached successfully!');
      // Notify parent to refresh form data
      onFormChange();
    } catch (error) {
      console.error('Error attaching form:', error);
      toast.error('Failed to attach form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnattach = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/drive/unattach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        throw new Error('Failed to un-attach form');
      }

      // Notify parent to refresh form data
      onFormChange();
    } catch (error) {
      console.error('Error un-attaching form:', error);
      alert('Failed to un-attach form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Item 
      variant="outline"
      className={isCopied ? 'bg-green-500/10 border-green-500/30' : ''}
    >
      <ItemMedia variant="image">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCopied ? 'bg-green-500/20' : 'bg-muted'}`}>
          <GoogleFormsIcon className={`w-6 h-6 ${isCopied ? 'text-green-500' : ''}`} />
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {isCopied ? 'Google Form is now attached' : 'Attach a Form'}
        </ItemTitle>
        <ItemDescription className="max-w-100">
          {isCopied && fileName ? (
            <div className="flex flex-col gap-1">
              <span>Members will now have to fill out the form <span className="font-semibold text-foreground">&quot;{fileName}&quot;</span> before signing up to the event.</span>
              <span className="text-xs text-muted-foreground">You can edit the form in Google Forms and members will be shown the latest updated form.</span>
            </div>
          ) : (
            'Connect your Google account to attach a form for member sign-ups'
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {isCopied ? (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`https://docs.google.com/forms/d/${fileId}/edit`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open Form
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64">
                  <div className="flex items-center gap-3">
                    {user.picture && !imgError ? (
                      <Image
                        src={user.picture}
                        alt={user.name || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <GoogleIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This form is owned by this Google account.
                  </p>
                </PopoverContent>
              </Popover>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleUnattach} variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Un-attach
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Attaching Form...
              </>
            ) : hasSavedToken ? (
              "Copy Form Template"
            ) : (
              <>
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-white p-0.5">
                  <GoogleIcon className="h-4 w-4" />
                </span>
                Connect to Google
              </>
            )}
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}

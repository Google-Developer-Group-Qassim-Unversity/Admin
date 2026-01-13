'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { GoogleFormsIcon } from '@/lib/google-icons';
import { MoreHorizontal, Loader2, ExternalLink, RefreshCw, Trash2, AlertCircle } from 'lucide-react';

interface FormData {
  id?: number;
  googleFormId: string | null;
  formName: string | null;
}

interface FormsCopyItemProps {
  isAuthenticated: boolean;
  eventId: number;
  formData: FormData | null;
  onFormChange: () => void;
}

export function FormsCopyItem({ isAuthenticated, eventId, formData, onFormChange }: FormsCopyItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('FormsCopyItem formData:', formData);

  const isCopied = !!formData?.googleFormId;
  const fileName = formData?.formName;
  const fileId = formData?.googleFormId;

  const handleCopy = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/drive/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy file');
      }

      // Notify parent to refresh form data
      onFormChange();
    } catch (error) {
      console.error('Error copying file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy file. Please try again.';
      setError(errorMessage);
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

  const handleReplace = async () => {
    // First un-attach, then copy new
    setIsLoading(true);
    setError(null);
    try {
      // Un-attach current form
      await fetch('/api/drive/unattach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      // Copy new form
      const response = await fetch('/api/drive/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to replace form');
      }

      // Notify parent to refresh form data
      onFormChange();
    } catch (error) {
      console.error('Error replacing form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to replace form. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Item 
        variant="outline"
        className={isCopied ? 'bg-green-500/10 border-green-500/30' : error ? 'bg-destructive/10 border-destructive/30' : ''}
      >
        <ItemMedia variant="image">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCopied ? 'bg-green-500/20' : error ? 'bg-destructive/20' : 'bg-muted'}`}>
            {error ? (
              <AlertCircle className="w-6 h-6 text-destructive" />
            ) : (
              <GoogleFormsIcon className={`w-6 h-6 ${isCopied ? 'text-green-500' : ''}`} />
            )}
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
              'Attach a Google Form so that members fill it out before signing up to the event'
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
                <DropdownMenuItem onClick={handleReplace}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Replace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUnattach} variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Un-attach
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleCopy}
                    disabled={!isAuthenticated || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      'Copy Form'
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isAuthenticated && (
                <TooltipContent>
                  <p>Connect Google account first</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </ItemActions>
    </Item>
    {error && (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="font-medium">Failed to attach form</span>
          <span className="text-destructive/80">{error}</span>
        </div>
      </div>
    )}
    </>
  );
}

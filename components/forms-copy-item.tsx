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
import { MoreHorizontal, Loader2, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';

interface FormsCopyItemProps {
  isAuthenticated: boolean;
}

export function FormsCopyItem({ isAuthenticated }: FormsCopyItemProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/drive/copy', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to copy file');
      }

      const data = await response.json();
      setFileName(data.name);
      setFileId(data.id);
      setIsCopied(true);
    } catch (error) {
      console.error('Error copying file:', error);
      alert('Failed to copy file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnattach = () => {
    setIsCopied(false);
    setFileName(null);
    setFileId(null);
  };

  const handleReplace = async () => {
    handleUnattach();
    await handleCopy();
  };

  return (
    <Item 
      variant="outline"
      className={isCopied ? 'bg-green-50 border-green-200' : ''}
    >
      <ItemMedia variant="image">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCopied ? 'bg-green-100' : 'bg-gray-100'}`}>
          <GoogleFormsIcon className={`w-6 h-6 ${isCopied ? 'text-green-600' : ''}`} />
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {isCopied ? 'Google Form is now attached' : 'Attach a Form'}
        </ItemTitle>
        <ItemDescription className="max-w-100">
          {isCopied && fileName ? (
            <div className="flex flex-col gap-1">
              <span>Members will now have to fill out the form <span className="font-semibold text-foreground">&quot{fileName}&quot</span> before signing up to the event.</span>
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
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
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
  );
}

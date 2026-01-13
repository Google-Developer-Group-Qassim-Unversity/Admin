'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Check, Upload, Loader2 } from 'lucide-react';

interface PublishItemProps {
  isAuthenticated: boolean;
}

export function PublishItem({ isAuthenticated }: PublishItemProps) {
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePublish = async () => {
    setIsLoading(true);
    // Simulate 2 seconds loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPublished(true);
    setIsLoading(false);
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    // Simulate 2 seconds loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPublished(false);
    setIsLoading(false);
  };

  return (
    <Item 
      variant="outline"
      className={isPublished ? 'bg-green-500/10 border-green-500/30' : ''}
    >
      <ItemMedia variant="image">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPublished ? 'bg-green-500/20' : 'bg-muted'}`}>
          {isPublished ? (
            <Check className="w-6 h-6 text-green-500" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Publish Form</ItemTitle>
        <ItemDescription>
          {isPublished ? 'Form is live' : 'Make your form public'}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={isPublished ? handleUnpublish : handlePublish}
                  disabled={isLoading || (!isPublished && !isAuthenticated)}
                  variant={isPublished ? 'outline' : 'default'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPublished ? 'Unpublishing...' : 'Publishing...'}
                    </>
                  ) : (
                    isPublished ? 'Unpublish' : 'Publish'
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!isAuthenticated && !isPublished && (
              <TooltipContent>
                <p>Connect Google account first</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </ItemActions>
    </Item>
  );
}

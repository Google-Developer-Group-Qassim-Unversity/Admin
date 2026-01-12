'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { GoogleIcon } from '@/lib/google-icons';
import { Check } from 'lucide-react';

interface GoogleConnectItemProps {
  isAuthenticated: boolean;
  user: { name?: string; email?: string; picture?: string } | null;
  isLoading: boolean;
  onAuthChange: () => void;
}

export function GoogleConnectItem({ 
  isAuthenticated, 
  user, 
  isLoading, 
  onAuthChange 
}: GoogleConnectItemProps) {
  const [imgError, setImgError] = useState(false);

  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/disconnect', { method: 'POST' });
      onAuthChange();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  if (isLoading) {
    return (
      <Item variant="outline">
        <ItemMedia>
          <Skeleton className="w-12 h-12 rounded-lg" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            <Skeleton className="h-5 w-32" />
          </ItemTitle>
          <ItemDescription>
            <Skeleton className="h-4 w-48" />
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Skeleton className="h-9 w-24" />
        </ItemActions>
      </Item>
    );
  }

  return (
    <Item 
      variant="outline" 
      className={isAuthenticated ? 'bg-green-50 border-green-200' : ''}
    >
      <ItemMedia>
        {isAuthenticated && user?.picture && !imgError ? (
          <Image 
            src={user.picture} 
            alt={user.name || 'User'} 
            width={48}
            height={48}
            className="rounded-lg object-cover border border-green-100 shadow-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isAuthenticated ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isAuthenticated ? (
              <Check className="w-6 h-6 text-green-600" />
            ) : (
              <GoogleIcon className="w-6 h-6" />
            )}
          </div>
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle className={isAuthenticated ? 'font-medium' : ''}>
          {isAuthenticated ? user?.email : 'Google Account'}
        </ItemTitle>
        <ItemDescription>
          {isAuthenticated ? user?.name : 'Connect your Google account'}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          onClick={isAuthenticated ? handleDisconnect : handleConnect}
          variant={isAuthenticated ? 'outline' : 'default'}
        >
          {isAuthenticated ? 'Disconnect' : 'Connect'}
        </Button>
      </ItemActions>
    </Item>
  );
}

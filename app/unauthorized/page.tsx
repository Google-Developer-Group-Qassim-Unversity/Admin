"use client";

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-destructive mb-4">🚫</h1>
          <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6">
            This is an admin-only system. New accounts can only be created by administrators.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In with Existing Account
          </Link>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Need access? Contact your system administrator to create an account for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
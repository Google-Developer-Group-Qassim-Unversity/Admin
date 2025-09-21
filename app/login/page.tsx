"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Access Only</h1>
            <p className="text-muted-foreground">
              Loading authentication...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Access Only</h1>
          <p className="text-muted-foreground">
            Sign in with your authorized admin credentials
          </p>
        </div>
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="text-sm text-blue-700">
            💡 After successful login, you will be automatically redirected to the admin dashboard.
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg border",
              footerAction: "hidden",
            },
          }}
          routing="hash"
          signUpUrl={undefined}
          redirectUrl="/"
        />
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have access? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
'use client'

import React, { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (user) {
        // Explicitly check onboarding status
        const isOnboardingCompleted = user.onboardingCompleted === true;
        
        // If onboarding is completed, redirect away from onboarding page
        if (isOnboardingCompleted) {
          if (pathname === '/onboarding') {
            router.push('/dashboard');
          }
        }
        // If onboarding is not completed, redirect to onboarding (except if already on onboarding page)
        else {
          if (pathname && pathname !== '/onboarding') {
            router.push('/onboarding');
          }
        }
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;


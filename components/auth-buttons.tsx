'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from './auth-context';

export default function AuthButtons() {
  const { user, profile, signOut, isLoading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false);
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          S'inscrire
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">
            {profile?.full_name || user.email?.split('@')[0] || 'Utilisateur'}
          </p>
          <p className="text-xs text-gray-500">Mon compte</p>
        </div>
      </button>

      {isDropdownOpen && (
        <>
          {/* Overlay pour fermer le dropdown en cliquant ailleurs */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsDropdownOpen(false)}
            >
              <User className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsDropdownOpen(false)}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Mon profil
            </Link>
            <div className="border-t border-gray-100 my-1"></div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  );
}
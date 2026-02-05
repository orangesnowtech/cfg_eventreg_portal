'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, User, Briefcase, Calendar, Clock } from 'lucide-react';
import type { Guest } from '@/types/guest';
import { formatTimestamp, formatGuestName } from '@/types/guest';

interface GuestWithId extends Guest {
  id: string;
}

export default function CheckInForm() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [guests, setGuests] = useState<GuestWithId[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithId | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not-found' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchStatus('idle');
    setErrorMessage('');
    setGuests([]);
    setSelectedGuest(null);
    setCheckInSuccess(false);

    try {
      const response = await fetch(`/api/check-in/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Search failed');
      }

      if (result.found && result.guests && result.guests.length > 0) {
        setGuests(result.guests);
        setSearchStatus('found');
        // Auto-select if only one result
        if (result.guests.length === 1) {
          setSelectedGuest(result.guests[0]);
        }
      } else {
        setSearchStatus('not-found');
        setErrorMessage('No guest found with this access code or name.');
      }
    } catch (error) {
      setSearchStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedGuest || !selectedGuest.id) return;

    setIsCheckingIn(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/check-in/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestId: selectedGuest.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Check-in failed');
      }

      // Update selected guest state with checked-in data
      setSelectedGuest(result.guest);
      setCheckInSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setSearchQuery('');
        setGuests([]);
        setSelectedGuest(null);
        setSearchStatus('idle');
        setCheckInSuccess(false);
      }, 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Guest Check-In</h1>
          <p className="text-gray-600 dark:text-gray-300">Search by access code, first name, or last name</p>
        </div>

        {/* Search Form */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Access Code, First Name, or Last Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 pl-12 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter code or name"
                  disabled={isSearching}
                  autoComplete="off"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Search Guest
                </>
              )}
            </button>
          </form>
        </div>

        {/* Not Found Message */}
        {searchStatus === 'not-found' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold text-lg">Guest Not Found</h3>
                <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                  No registration found for &ldquo;{searchQuery}&rdquo;. Please verify the access code or name.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {searchStatus === 'error' && errorMessage && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-semibold text-lg">Error</h3>
                <p className="text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {checkInSuccess && selectedGuest && (
          <div className="bg-green-50 border-4 border-green-300 rounded-xl p-8 mb-6 animate-pulse">
            <div className="text-center">
              <CheckCircle2 className="h-24 w-24 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-green-800 mb-2">✓ CHECK-IN SUCCESSFUL</h2>
              <p className="text-xl text-green-700">Welcome, {formatGuestName(selectedGuest)}!</p>
              <p className="text-sm text-green-600 mt-2">
                Checked in at {formatTimestamp(selectedGuest.checkedInAt)}
              </p>
            </div>
          </div>
        )}

        {/* Multiple Results List */}
        {searchStatus === 'found' && guests.length > 1 && !selectedGuest && !checkInSuccess && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Found {guests.length} guests matching &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select a guest to view details and check in:</p>
            <div className="space-y-3">
              {guests.map((guestItem) => (
                <button
                  key={guestItem.id}
                  onClick={() => setSelectedGuest(guestItem)}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatGuestName(guestItem)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{guestItem.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {guestItem.organizationName} • Code: {guestItem.accessCode}
                        </p>
                      </div>
                    </div>
                    {guestItem.checkedIn && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        Already Checked In
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setGuests([]);
                setSearchStatus('idle');
                setSearchQuery('');
              }}
              className="mt-4 w-full text-center py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              ← Start New Search
            </button>
          </div>
        )}

        {/* Guest Details Card */}
        {searchStatus === 'found' && selectedGuest && !checkInSuccess && (
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            {/* Back to Results Button (if multiple results) */}
            {guests.length > 1 && (
              <div className="bg-gray-50 border-b px-4 py-3">
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Back to {guests.length} results
                </button>
              </div>
            )}
            
            {/* Already Checked In Warning */}
            {selectedGuest.checkedIn && (
              <div className="bg-orange-50 border-b-2 border-orange-200 p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-orange-600 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-orange-800 font-semibold text-lg">⚠️ Already Checked In</h3>
                    <p className="text-orange-700 text-sm mt-1">
                      This guest was checked in on {formatTimestamp(selectedGuest.checkedInAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Information */}
            <div className="p-6">
              <div className="flex items-center mb-6 pb-4 border-b">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formatGuestName(selectedGuest)}</h2>
                  <p className="text-gray-600 dark:text-gray-300">{selectedGuest.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedGuest.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Access Code</p>
                    <p className="font-mono font-bold text-lg text-blue-600">{selectedGuest.accessCode}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-start mb-3">
                    <Briefcase className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedGuest.jobTitle}</p>
                      <p className="text-gray-600 dark:text-gray-300">{selectedGuest.organizationName}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Guest Type</p>
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {selectedGuest.guestType}
                  </span>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Registered</p>
                      <p className="text-gray-900">{formatTimestamp(selectedGuest.registeredAt)}</p>
                    </div>
                  </div>
                </div>

                {selectedGuest.checkedIn && selectedGuest.checkedInAt && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Checked In</p>
                        <p className="text-gray-900">{formatTimestamp(selectedGuest.checkedInAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Check-In Button */}
            {!selectedGuest.checkedIn && (
              <div className="bg-gray-50 px-6 py-4 border-t">
                <button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center text-lg"
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="animate-spin h-6 w-6 mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-6 w-6 mr-2" />
                      Confirm Check-In
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        {searchStatus === 'idle' && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">
              Enter the 6-digit access code from the guest&apos;s email<br />
              or search by their first name or last name
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin';
import type { Guest } from '@/types/guest';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query')?.trim().toUpperCase();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search by access code (exact match) or first/last name (case-insensitive partial match)
    let guests: Guest[] = [];

    // First, try exact access code match (most common case)
    if (query.length === 6 && /^[A-Z0-9]+$/.test(query)) {
      const accessCodeSnapshot = await adminDb
        .collection('guests')
        .where('accessCode', '==', query)
        .limit(1)
        .get();

      if (!accessCodeSnapshot.empty) {
        const data = accessCodeSnapshot.docs[0].data();
        guests.push({
          id: accessCodeSnapshot.docs[0].id,
          ...data,
        } as Guest);
      }
    }

    // If not found by access code, search by first name or last name
    if (guests.length === 0) {
      const allGuests = await adminDb.collection('guests').get();
      
      for (const doc of allGuests.docs) {
        const data = doc.data();
        const firstName = data.firstName?.toUpperCase() || '';
        const lastName = data.lastName?.toUpperCase() || '';
        
        if (firstName.includes(query) || lastName.includes(query)) {
          guests.push({
            id: doc.id,
            ...data,
          } as Guest);
        }
      }
    }

    if (guests.length === 0) {
      return NextResponse.json(
        { found: false, message: 'No guest found matching the search query' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        found: true,
        guests: guests,
        count: guests.length,
        message: guests.length === 1 ? 'Guest found successfully' : `${guests.length} guests found`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'An error occurred during search. Please try again.' },
      { status: 500 }
    );
  }
}

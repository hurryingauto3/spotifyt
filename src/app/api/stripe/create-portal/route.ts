/**
 * Create Stripe Customer Portal Session
 *
 * Allows users to manage their subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createPortalSession } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const portalSession = await createPortalSession({
      customerId: session.subscription.stripeCustomerId,
      returnUrl: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('[Stripe] Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Create Stripe Checkout Session
 *
 * Creates a checkout session for Pro subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createCheckoutSession } from '@/lib/stripe/client';
import { STRIPE_CONFIG } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Get user email from Spotify
    if (!session.spotify?.userId) {
      return NextResponse.json(
        { error: 'Please connect Spotify first' },
        { status: 401 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      priceId: STRIPE_CONFIG.prices.pro_monthly.id,
      customerId: session.subscription?.stripeCustomerId,
      customerEmail: session.spotify.userId, // Use Spotify ID as email reference
      successUrl: `${appUrl}/billing?success=true`,
      cancelUrl: `${appUrl}/pricing?canceled=true`,
      metadata: {
        userId: session.spotify.userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[Stripe] Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}

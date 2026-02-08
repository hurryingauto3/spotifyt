/**
 * Subscription Status API
 *
 * Returns user's subscription tier and usage stats
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    // Initialize subscription if not exists
    if (!session.subscription) {
      session.subscription = {
        tier: 'free',
        monthlySyncs: 0,
        lastResetDate: Date.now(),
      };
      await session.save();
    }

    // Reset monthly counter if needed (first of the month)
    const now = Date.now();
    const lastReset = session.subscription.lastResetDate || 0;
    const currentMonth = new Date(now).getMonth();
    const lastResetMonth = new Date(lastReset).getMonth();

    if (currentMonth !== lastResetMonth) {
      session.subscription.monthlySyncs = 0;
      session.subscription.lastResetDate = now;
      await session.save();
    }

    return NextResponse.json({
      tier: session.subscription.tier || 'free',
      monthlySyncs: session.subscription.monthlySyncs || 0,
      lastResetDate: session.subscription.lastResetDate,
      currentPeriodEnd: session.subscription.currentPeriodEnd,
      stripeCustomerId: session.subscription.stripeCustomerId,
    });
  } catch (error) {
    console.error('[Subscription] Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

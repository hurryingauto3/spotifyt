/**
 * Stripe Webhook Handler
 *
 * Handles subscription events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import Stripe from 'stripe';

// This must be raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] No webhook secret configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error('[Stripe Webhook] Signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[Stripe Webhook] Received event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('[Stripe] Checkout completed:', {
    customer: session.customer,
    subscription: session.subscription,
  });

  // In a real app, you'd update your database here
  // For now, we'll rely on session storage
  // You could use Redis or a database to map stripeCustomerId -> userId
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[Stripe] Subscription updated:', {
    id: subscription.id,
    status: subscription.status,
    customer: subscription.customer,
  });

  // Update subscription status in your database
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[Stripe] Subscription deleted:', {
    id: subscription.id,
    customer: subscription.customer,
  });

  // Downgrade user to free tier in your database
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('[Stripe] Payment succeeded:', {
    customer: invoice.customer,
    amount: invoice.amount_paid,
  });

  // Optional: Send receipt email, update analytics, etc.
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[Stripe] Payment failed:', {
    customer: invoice.customer,
    attempt: invoice.attempt_count,
  });

  // Optional: Send payment failure notification
}

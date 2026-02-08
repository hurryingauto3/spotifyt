'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STRIPE_CONFIG } from '@/lib/stripe/config';

interface SubscriptionStatus {
  tier: 'free' | 'pro';
  monthlySyncs?: number;
  lastResetDate?: number;
  currentPeriodEnd?: number;
  stripeCustomerId?: string;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  async function fetchSubscriptionStatus() {
    try {
      const res = await fetch('/api/subscription/status');
      const data = await res.json();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openCustomerPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
        setPortalLoading(false);
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal');
      setPortalLoading(false);
    }
  }

  const isPro = subscription?.tier === 'pro';
  const features = subscription ? STRIPE_CONFIG.features[subscription.tier] : null;
  const syncsUsed = subscription?.monthlySyncs || 0;
  const syncsLimit = features?.monthlySyncLimit || 100;
  const syncsRemaining = syncsLimit === Infinity ? Infinity : syncsLimit - syncsUsed;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-purple-200">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-5xl font-bold text-white mb-3">Billing & Subscription</h1>
          <p className="text-purple-200 text-lg">Manage your plan and usage</p>
        </div>

        {/* Current Plan */}
        <div className={`${isPro ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-white/5 backdrop-blur-lg border border-white/10'} rounded-3xl p-8 mb-8 shadow-2xl`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {isPro ? '🌟 Pro Plan' : '🆓 Free Plan'}
              </h2>
              <p className="text-white/80 text-lg">
                {isPro ? 'You have full access to all features' : 'Limited features - upgrade for more'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-white">
                {isPro ? '$4.99' : '$0'}
              </div>
              <div className="text-white/80">per month</div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Monthly Syncs</span>
              <span className="text-white font-bold">
                {syncsUsed} / {syncsLimit === Infinity ? '∞' : syncsLimit}
              </span>
            </div>
            {syncsLimit !== Infinity && (
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((syncsUsed / syncsLimit) * 100, 100)}%` }}
                />
              </div>
            )}
            {syncsLimit !== Infinity && syncsRemaining <= 10 && syncsRemaining > 0 && (
              <p className="text-yellow-200 text-sm mt-2">
                ⚠️ Only {syncsRemaining} syncs remaining this month
              </p>
            )}
            {syncsLimit !== Infinity && syncsRemaining <= 0 && (
              <p className="text-red-200 text-sm mt-2">
                ❌ Monthly limit reached. Upgrade to Pro for unlimited syncs!
              </p>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{syncsLimit === Infinity ? 'Unlimited' : `${syncsLimit}`} syncs/month</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{features?.platforms.length || 2} platforms</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPro ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
              </svg>
              <span>AI-powered matching</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPro ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
              </svg>
              <span>Priority support</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!isPro ? (
              <Link
                href="/pricing"
                className="flex-1 px-6 py-4 bg-white text-purple-600 text-center rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
              >
                Upgrade to Pro
              </Link>
            ) : (
              <>
                <button
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                  className="flex-1 px-6 py-4 bg-white text-purple-600 text-center rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </button>
              </>
            )}
          </div>

          {isPro && subscription?.currentPeriodEnd && (
            <p className="text-white/70 text-sm mt-4 text-center">
              Next billing date:{' '}
              {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Need Help?</h3>
                <p className="text-purple-200 mb-4">
                  Questions about your subscription or billing? We're here to help.
                </p>
                <a
                  href="mailto:support@spotifyt.com"
                  className="text-purple-300 hover:text-white transition-colors font-medium"
                >
                  Contact Support →
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Secure Payments</h3>
                <p className="text-purple-200 mb-4">
                  All payments are processed securely through Stripe. We never store your card details.
                </p>
                <span className="text-purple-300 font-medium">
                  Powered by Stripe ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

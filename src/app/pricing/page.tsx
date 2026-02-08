'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-purple-200">
            Start free, upgrade when you need more
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 hover:scale-105 transition-all duration-300">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Free</h2>
              <div className="text-5xl font-black text-white mb-4">
                $0<span className="text-2xl text-purple-200">/mo</span>
              </div>
              <p className="text-purple-200">Perfect for trying out the platform</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>100 songs/month</strong> sync limit</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>2 platforms</strong> (Spotify + YouTube)</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Basic track matching</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Smart Import feature</span>
              </li>
            </ul>

            <Link
              href="/dashboard"
              className="block w-full px-6 py-4 bg-white/10 backdrop-blur-sm text-white text-center rounded-xl hover:bg-white/20 transition-all duration-200 font-bold text-lg"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-8 relative overflow-hidden hover:scale-105 transition-all duration-300 shadow-2xl shadow-purple-500/50">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-white text-sm font-bold">
              POPULAR
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Pro</h2>
              <div className="text-5xl font-black text-white mb-4">
                $4.99<span className="text-2xl text-white/80">/mo</span>
              </div>
              <p className="text-white/90">For power users who sync regularly</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Unlimited syncs</strong> per month</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>All 5 platforms</strong> (Spotify, YouTube, Tidal, Deezer, Apple Music)</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>AI-powered matching</strong> with Gemini</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Priority support</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Analytics dashboard</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full px-6 py-4 bg-white text-purple-600 text-center rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-purple-200">
                Yes! You can cancel your Pro subscription at any time. You'll still have access until the end of your billing period.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                What happens when I hit the free tier limit?
              </h3>
              <p className="text-purple-200">
                Once you've synced 100 songs in a month, you'll need to wait until the next month or upgrade to Pro for unlimited syncs.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                Do I need all 5 platform accounts?
              </h3>
              <p className="text-purple-200">
                No! You can connect whichever platforms you use. Pro tier simply gives you access to all available platforms.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                Is my data secure?
              </h3>
              <p className="text-purple-200">
                Absolutely! We only store temporary session data. Your music library data never leaves our secure servers, and we use OAuth for all platform connections.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold text-lg shadow-2xl hover:shadow-purple-500/50"
          >
            <span>Start Free Today</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Stripe Configuration
 *
 * Centralized pricing and feature configuration
 */

export const STRIPE_CONFIG = {
  // Pricing
  prices: {
    pro_monthly: {
      id: process.env.STRIPE_PRO_PRICE_ID || '',
      amount: 499, // $4.99 in cents
      currency: 'usd',
      interval: 'month',
    },
  },

  // Feature limits by tier
  features: {
    free: {
      name: 'Free',
      monthlySyncLimit: 100,
      platforms: ['spotify', 'youtube'] as const,
      aiMatching: false,
      analytics: false,
      priority: false,
    },
    pro: {
      name: 'Pro',
      monthlySyncLimit: Infinity,
      platforms: ['spotify', 'youtube', 'tidal', 'deezer', 'apple'] as const,
      aiMatching: true,
      analytics: true,
      priority: true,
    },
  },
} as const;

export type SubscriptionTier = 'free' | 'pro';

export function getFeatures(tier: SubscriptionTier) {
  return STRIPE_CONFIG.features[tier];
}

export function canAccessFeature(
  userTier: SubscriptionTier,
  feature: keyof typeof STRIPE_CONFIG.features.pro
): boolean {
  const userFeatures = STRIPE_CONFIG.features[userTier];
  const proFeatures = STRIPE_CONFIG.features.pro;

  if (feature === 'platforms') {
    return true; // Always allow access check, actual limit enforced elsewhere
  }

  return userFeatures[feature] === proFeatures[feature];
}

export function isPlatformAllowed(
  tier: SubscriptionTier,
  platform: string
): boolean {
  const features = getFeatures(tier);
  return features.platforms.includes(platform as any);
}

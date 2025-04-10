import { safeGet, safeSet, safeUpdate } from "./db-helpers"

// Subscription tiers and pricing
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  PREMIUM: "premium",
  CREATOR: "creator",
} as const

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  isPopular?: boolean
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: SUBSCRIPTION_TIERS.FREE,
    name: "Free",
    description: "Basic access to the platform",
    price: 0,
    features: ["Create and share loops", "Follow other users", "Basic moderation tools", "Standard BOB AI assistance"],
  },
  {
    id: SUBSCRIPTION_TIERS.PREMIUM,
    name: "Premium",
    description: "Enhanced experience with no ads",
    price: 499, // $4.99
    isPopular: true,
    features: [
      "Ad-free experience",
      "Access to exclusive content",
      "Priority support",
      "Enhanced BOB AI capabilities",
      "Early access to new features",
    ],
  },
  {
    id: SUBSCRIPTION_TIERS.CREATOR,
    name: "Creator",
    description: "Monetize your content",
    price: 999, // $9.99
    features: [
      "All Premium features",
      "Create paid loops",
      "Analytics dashboard",
      "97% revenue share on paid loops",
      "Promotional tools",
      "Dedicated creator support",
    ],
  },
]

export interface UserSubscription {
  userId: string
  tier: SubscriptionTier
  status: "active" | "canceled" | "past_due"
  startDate: number
  endDate: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  cancelAtPeriodEnd?: boolean
  paymentMethod?: {
    brand: string
    last4: string
    expiryMonth: number
    expiryYear: number
  }
}

/**
 * Get a user's subscription
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const subscription = await safeGet(`subscriptions/${userId}`)
    return subscription
  } catch (error) {
    console.error("Error getting user subscription:", error)
    return null
  }
}

/**
 * Check if a user has an active subscription of a specific tier
 */
export async function hasActiveSubscription(userId: string, tier?: SubscriptionTier): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId)

    if (!subscription) return false

    const isActive = subscription.status === "active" && subscription.endDate > Date.now()

    if (!tier) return isActive

    // Check for specific tier or higher
    if (tier === SUBSCRIPTION_TIERS.FREE) return true

    if (tier === SUBSCRIPTION_TIERS.PREMIUM) {
      return (
        isActive &&
        (subscription.tier === SUBSCRIPTION_TIERS.PREMIUM || subscription.tier === SUBSCRIPTION_TIERS.CREATOR)
      )
    }

    if (tier === SUBSCRIPTION_TIERS.CREATOR) {
      return isActive && subscription.tier === SUBSCRIPTION_TIERS.CREATOR
    }

    return false
  } catch (error) {
    console.error("Error checking active subscription:", error)
    return false
  }
}

/**
 * Create a checkout session for subscription
 * Note: In a real implementation, this would be a server-side function
 */
export async function createCheckoutSession(
  userId: string,
  planId: SubscriptionTier,
  successUrl: string,
  cancelUrl: string,
): Promise<{ sessionId: string; url: string } | null> {
  try {
    // This would normally be a server-side API call to Stripe
    // For demo purposes, we'll simulate the response

    // In a real implementation, you would:
    // 1. Call your backend API
    // 2. Backend creates a Stripe checkout session
    // 3. Return the session ID and URL

    console.log(`Creating checkout session for user ${userId} and plan ${planId}`)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simulate checkout session
    const sessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`
    const url = `${window.location.origin}/checkout/simulate?session_id=${sessionId}&plan=${planId}`

    return { sessionId, url }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return null
  }
}

/**
 * Handle successful subscription checkout
 * Note: In a real implementation, this would use Stripe webhooks
 */
export async function handleSubscriptionCheckoutSuccess(
  userId: string,
  planId: SubscriptionTier,
  sessionId: string,
): Promise<boolean> {
  try {
    // Get the plan details
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)

    if (!plan) {
      console.error(`Plan ${planId} not found`)
      return false
    }

    // Create a subscription record
    const now = Date.now()
    const oneMonthFromNow = now + 30 * 24 * 60 * 60 * 1000

    const subscription: UserSubscription = {
      userId,
      tier: planId,
      status: "active",
      startDate: now,
      endDate: oneMonthFromNow,
      stripeCustomerId: `cus_${Math.random().toString(36).substring(2, 10)}`,
      stripeSubscriptionId: `sub_${Math.random().toString(36).substring(2, 10)}`,
      cancelAtPeriodEnd: false,
      paymentMethod: {
        brand: "visa",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2025,
      },
    }

    // Save the subscription
    await safeSet(`subscriptions/${userId}`, subscription)

    // Update user profile with subscription status
    await safeUpdate(`users/${userId}`, {
      subscriptionTier: planId,
      subscriptionStatus: "active",
      subscriptionEndDate: oneMonthFromNow,
    })

    return true
  } catch (error) {
    console.error("Error handling subscription checkout success:", error)
    return false
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      console.error(`No subscription found for user ${userId}`)
      return false
    }

    // Update the subscription
    await safeUpdate(`subscriptions/${userId}`, {
      status: "canceled",
      cancelAtPeriodEnd: true,
    })

    // Update user profile
    await safeUpdate(`users/${userId}`, {
      subscriptionStatus: "canceled",
    })

    return true
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return false
  }
}


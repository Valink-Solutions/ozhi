import type { AuditPlugin, AuditEvent } from '../types.ts';
import { AuditCategory } from '../types.ts';
import type { Stripe } from 'stripe';

interface StripePluginOptions {
	stripe: Stripe;
}

export function createStripePlugin(options: StripePluginOptions): AuditPlugin {
	const { stripe } = options;

	return {
		name: 'stripe',

		beforeAudit: async (event: AuditEvent) => {
			// Enrich payment events with Stripe metadata
			if (event.category === AuditCategory.PAYMENT && event.target?.type === 'stripe_payment') {
				try {
					const paymentIntent = await stripe.paymentIntents.retrieve(event.target.id);
					event.metadata = {
						...event.metadata,
						stripe: {
							amount: paymentIntent.amount,
							currency: paymentIntent.currency,
							status: paymentIntent.status,
							customer: paymentIntent.customer
						}
					};
				} catch (error) {
					// Log error but don't fail the audit
					console.error('Failed to enrich Stripe data:', error);
				}
			}

			return event;
		}
	};
}

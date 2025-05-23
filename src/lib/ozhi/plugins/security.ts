import type { AuditPlugin, AuditEvent } from '../types.ts';
import { AuditCategory, AuditResult } from '../types.ts';

interface SecurityPluginOptions {
	maxFailedAttempts?: number;
	timeWindowMs?: number;
}

export function createSecurityPlugin(options: SecurityPluginOptions = {}): AuditPlugin {
	const { maxFailedAttempts = 5, timeWindowMs = 300000 } = options; // 5 minutes default

	// In-memory store for tracking (consider Redis for production)
	const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

	return {
		name: 'security',

		afterAudit: async (event: AuditEvent) => {
			if (event.category === AuditCategory.AUTH && event.result === AuditResult.FAILURE) {
				const key = `${event.context.ipAddress}:${event.context.userId || 'anonymous'}`;
				const now = Date.now();

				let attempts = failedAttempts.get(key);
				if (!attempts || now - attempts.firstAttempt > timeWindowMs) {
					attempts = { count: 0, firstAttempt: now };
				}

				attempts.count++;
				failedAttempts.set(key, attempts);

				if (attempts.count >= maxFailedAttempts) {
					// Trigger security alert
					console.error(`SECURITY ALERT: Multiple failed auth attempts from ${key}`);
					// You could integrate with your security system here
				}
			}
		}
	};
}

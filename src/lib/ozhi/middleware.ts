import type { Handle, RequestEvent } from '@sveltejs/kit';
import { createAuditContext, runWithAuditContext } from './context.ts';
import { AuditResult, AuditSeverity, type AuditCategory } from './types.ts';

export function createAuditMiddleware(auth: any): Handle {
	return async ({ event, resolve }) => {
		// Extract session from better-auth
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		// Create audit context
		const context = createAuditContext({
			userId: session?.user?.id,
			user: session?.user,
			sessionId: session?.session?.id,
			ipAddress: event.getClientAddress(),
			userAgent: event.request.headers.get('user-agent') || undefined,
			metadata: {
				path: event.url.pathname,
				method: event.request.method
			}
		});

		// Run the request with audit context
		return runWithAuditContext(context, () => resolve(event));
	};
}

// Helper for server-side actions
export function withAudit<T extends (...args: any[]) => any>(
	action: string,
	category: AuditCategory,
	handler: T
): T {
	return (async (...args: Parameters<T>) => {
		const { audit } = await import('./auditor.ts');

		try {
			const result = await handler(...args);

			await audit({
				action,
				category,
				result: AuditResult.SUCCESS,
				metadata: { args: args[0] },
				severity: AuditSeverity.LOW
			});

			return result;
		} catch (error) {
			await audit({
				action,
				category,
				result: AuditResult.FAILURE,
				error: error instanceof Error ? error.message : 'Unknown error',
				metadata: { args: args[0] },
				severity: AuditSeverity.MEDIUM
			});

			throw error;
		}
	}) as T;
}

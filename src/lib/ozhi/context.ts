import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditContext } from './types.ts';
import { nanoid } from 'nanoid';

const auditContextStorage = new AsyncLocalStorage<AuditContext>();

export function createAuditContext(partial: Partial<AuditContext> = {}): AuditContext {
	return {
		requestId: nanoid(),
		timestamp: new Date(),
		...partial
	};
}

export function runWithAuditContext<T>(
	context: AuditContext,
	fn: () => T | Promise<T>
): T | Promise<T> {
	return auditContextStorage.run(context, fn);
}

export function getAuditContext(): AuditContext | undefined {
	return auditContextStorage.getStore();
}

export function updateAuditContext(updates: Partial<AuditContext>): void {
	const current = getAuditContext();
	if (current) {
		Object.assign(current, updates);
	}
}

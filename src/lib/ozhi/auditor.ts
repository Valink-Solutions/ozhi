import { db } from '../server/db/index.ts'; // Your drizzle instance
import { auditLogs } from './db/schema.ts';
import { getAuditContext } from './context.ts';
import type { AuditEvent, AuditPlugin } from './types.ts';
import { AuditSeverity, AuditResult } from './types.ts';

class Auditor {
	private plugins: AuditPlugin[] = [];

	registerPlugin(plugin: AuditPlugin): void {
		this.plugins.push(plugin);
	}

	async initialize(): Promise<void> {
		for (const plugin of this.plugins) {
			if (plugin.initialize) {
				await plugin.initialize();
			}
		}
	}

	async log(
		event: Omit<AuditEvent, 'context'> & { context?: Partial<AuditEvent['context']> }
	): Promise<void> {
		const context = getAuditContext();
		if (!context && !event.context) {
			throw new Error('No audit context available');
		}

		let auditEvent: AuditEvent = {
			...event,
			context: {
				...context!,
				...event.context
			}
		};

		// Run beforeAudit plugins
		for (const plugin of this.plugins) {
			if (plugin.beforeAudit) {
				const result = await plugin.beforeAudit(auditEvent);
				if (result === null) return; // Plugin cancelled the audit
				auditEvent = result;
			}
		}

		// Determine severity if not provided
		if (!auditEvent.severity) {
			auditEvent.severity = this.determineSeverity(auditEvent);
		}

		// Store in database
		await db.insert(auditLogs).values({
			action: auditEvent.action,
			category: auditEvent.category,
			severity: auditEvent.severity,
			result: auditEvent.result,
			userId: auditEvent.context.userId,
			sessionId: auditEvent.context.sessionId,
			requestId: auditEvent.context.requestId,
			ipAddress: auditEvent.context.ipAddress,
			userAgent: auditEvent.context.userAgent,
			targetType: auditEvent.target?.type,
			targetId: auditEvent.target?.id,
			targetName: auditEvent.target?.name,
			changesBefore: auditEvent.changes?.before,
			changesAfter: auditEvent.changes?.after,
			changedFields: auditEvent.changes?.fields,
			error: auditEvent.error,
			metadata: {
				...auditEvent.context.metadata,
				...auditEvent.metadata
			},
			timestamp: auditEvent.context.timestamp
		});

		// Run afterAudit plugins
		for (const plugin of this.plugins) {
			if (plugin.afterAudit) {
				await plugin.afterAudit(auditEvent);
			}
		}
	}

	private determineSeverity(event: AuditEvent): AuditSeverity {
		// Auto-determine severity based on action and result
		if (event.result === AuditResult.FAILURE) {
			if (event.category === 'auth' || event.category === 'payment') {
				return AuditSeverity.HIGH;
			}
			return AuditSeverity.MEDIUM;
		}

		// Customize based on your business rules
		const criticalActions = ['delete_user', 'modify_permissions', 'process_refund'];
		if (criticalActions.includes(event.action)) {
			return AuditSeverity.CRITICAL;
		}

		return AuditSeverity.LOW;
	}
}

export const auditor = new Auditor();
export const audit = auditor.log.bind(auditor);

export function createAuditor(): Auditor {
	return new Auditor();
}

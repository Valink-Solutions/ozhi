import { auditLogs } from './db/schema.ts';
import { and, eq, gte, lte, inArray, desc } from 'drizzle-orm';
import type { AuditCategory, AuditSeverity } from './types.ts';

export interface AuditQueryOptions {
	userId?: string;
	category?: AuditCategory | AuditCategory[];
	severity?: AuditSeverity | AuditSeverity[];
	startDate?: Date;
	endDate?: Date;
	targetType?: string;
	targetId?: string;
	limit?: number;
	offset?: number;
}

export async function queryAuditLogs(db: any, options: AuditQueryOptions = {}) {
	const conditions = [];

	if (options.userId) {
		conditions.push(eq(auditLogs.userId, options.userId));
	}

	if (options.category) {
		if (Array.isArray(options.category)) {
			conditions.push(inArray(auditLogs.category, options.category));
		} else {
			conditions.push(eq(auditLogs.category, options.category));
		}
	}

	if (options.severity) {
		if (Array.isArray(options.severity)) {
			conditions.push(inArray(auditLogs.severity, options.severity));
		} else {
			conditions.push(eq(auditLogs.severity, options.severity));
		}
	}

	if (options.startDate) {
		conditions.push(gte(auditLogs.timestamp, options.startDate));
	}

	if (options.endDate) {
		conditions.push(lte(auditLogs.timestamp, options.endDate));
	}

	if (options.targetType) {
		conditions.push(eq(auditLogs.targetType, options.targetType));
	}

	if (options.targetId) {
		conditions.push(eq(auditLogs.targetId, options.targetId));
	}

	const query = db
		.select()
		.from(auditLogs)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(auditLogs.timestamp))
		.limit(options.limit || 100)
		.offset(options.offset || 0);

	return await query;
}

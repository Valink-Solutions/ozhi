import { pgTable, text, timestamp, jsonb, uuid, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const auditCategoryEnum = pgEnum('audit_category', [
	'auth',
	'payment',
	'data_access',
	'data_modification',
	'system',
	'invoice',
	'user_management'
]);

export const auditSeverityEnum = pgEnum('audit_severity', ['low', 'medium', 'high', 'critical']);

export const auditResultEnum = pgEnum('audit_result', ['success', 'failure', 'partial']);

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		action: text('action').notNull(),
		category: auditCategoryEnum('category').notNull(),
		severity: auditSeverityEnum('severity').notNull(),
		result: auditResultEnum('result').notNull(),

		// Context
		userId: text('user_id'),
		sessionId: text('session_id'),
		requestId: text('request_id').notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),

		// Target
		targetType: text('target_type'),
		targetId: text('target_id'),
		targetName: text('target_name'),

		// Changes and metadata
		changesBefore: jsonb('changes_before'),
		changesAfter: jsonb('changes_after'),
		changedFields: text('changed_fields').array(),

		// Error and additional data
		error: text('error'),
		metadata: jsonb('metadata'),

		// Timestamps
		timestamp: timestamp('timestamp').notNull().defaultNow(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return {
			userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
			categoryIdx: index('audit_logs_category_idx').on(table.category),
			timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
			actionIdx: index('audit_logs_action_idx').on(table.action),
			targetIdx: index('audit_logs_target_idx').on(table.targetType, table.targetId),
			requestIdIdx: index('audit_logs_request_id_idx').on(table.requestId)
		};
	}
);

import type { AuditPlugin, AuditEvent } from '../types.ts';
import { AuditSeverity } from '../types.ts';
import { Resend } from 'resend';

interface NotificationPluginOptions {
	resend: Resend;
	notifyEmail: string;
	severityThreshold?: AuditSeverity;
}

export function createNotificationPlugin(options: NotificationPluginOptions): AuditPlugin {
	const { resend, notifyEmail, severityThreshold = AuditSeverity.HIGH } = options;

	const severityOrder = {
		[AuditSeverity.LOW]: 0,
		[AuditSeverity.MEDIUM]: 1,
		[AuditSeverity.HIGH]: 2,
		[AuditSeverity.CRITICAL]: 3
	};

	return {
		name: 'notification',

		afterAudit: async (event: AuditEvent) => {
			// Only notify for events above threshold
			if (severityOrder[event.severity] < severityOrder[severityThreshold]) {
				return;
			}

			await resend.emails.send({
				from: process.env.EMAIL_FROM || 'no-reply@example.com',
				to: notifyEmail,
				subject: `[${event.severity.toUpperCase()}] Audit Alert: ${event.action}`,
				html: `
          <h2>Audit Event Detected</h2>
          <p><strong>Action:</strong> ${event.action}</p>
          <p><strong>Category:</strong> ${event.category}</p>
          <p><strong>Severity:</strong> ${event.severity}</p>
          <p><strong>Result:</strong> ${event.result}</p>
          <p><strong>User:</strong> ${event.context.user?.email || 'Unknown'}</p>
          <p><strong>Timestamp:</strong> ${event.context.timestamp.toISOString()}</p>
          ${event.error ? `<p><strong>Error:</strong> ${event.error}</p>` : ''}
          ${event.target ? `<p><strong>Target:</strong> ${event.target.type} (${event.target.id})</p>` : ''}
        `
			});
		}
	};
}

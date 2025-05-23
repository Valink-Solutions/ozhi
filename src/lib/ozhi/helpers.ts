import { audit } from './auditor.ts';
import { AuditCategory, AuditResult, AuditSeverity } from './types.ts';
import type { RequestEvent } from '@sveltejs/kit';

// Helper for form actions
export function auditFormAction<T extends Record<string, any>>(
	action: string,
	category: AuditCategory
) {
	return function decorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (event: RequestEvent) {
			const formData = await event.request.formData();
			const data = Object.fromEntries(formData);

			try {
				const result = await originalMethod.call(this, event);

				await audit({
					action,
					category,
					result: AuditResult.SUCCESS,
					metadata: { formData: data },
					severity: AuditSeverity.LOW
				});

				return result;
			} catch (error) {
				await audit({
					action,
					category,
					result: AuditResult.FAILURE,
					error: error instanceof Error ? error.message : 'Unknown error',
					metadata: { formData: data },
					severity: AuditSeverity.LOW
				});

				throw error;
			}
		};

		return descriptor;
	};
}

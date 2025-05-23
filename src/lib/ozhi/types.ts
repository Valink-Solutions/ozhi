export interface AuditContext {
	userId?: string;
	user?: any;
	sessionId?: string;
	requestId: string;
	ipAddress?: string;
	userAgent?: string;
	timestamp: Date;
	metadata?: Record<string, any>;
}

export interface AuditEvent<T = any> {
	id?: string;
	action: string;
	category: AuditCategory;
	severity: AuditSeverity;
	context: AuditContext;
	target?: AuditTarget;
	changes?: AuditChanges<T>;
	result: AuditResult;
	error?: string;
	metadata?: Record<string, any>;
}

export enum AuditCategory {
	AUTH = 'auth',
	PAYMENT = 'payment',
	DATA_ACCESS = 'data_access',
	DATA_MODIFICATION = 'data_modification',
	SYSTEM = 'system',
	INVOICE = 'invoice',
	USER_MANAGEMENT = 'user_management'
}

export enum AuditSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

export enum AuditResult {
	SUCCESS = 'success',
	FAILURE = 'failure',
	PARTIAL = 'partial'
}

export interface AuditTarget {
	type: string;
	id: string;
	name?: string;
	metadata?: Record<string, any>;
}

export interface AuditChanges<T = any> {
	before?: T;
	after?: T;
	fields?: string[];
}

export interface AuditPlugin {
	name: string;
	initialize?: () => Promise<void>;
	beforeAudit?: (event: AuditEvent) => Promise<AuditEvent | null>;
	afterAudit?: (event: AuditEvent) => Promise<void>;
}

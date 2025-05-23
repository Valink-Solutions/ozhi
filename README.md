# Ozhi - Audit System

[![License](https://img.shields.io/github/license/Valink-Solutions/ozhi)](https://github.com/Valink-Solutions/ozhi/blob/master/LICENSE)
[![Test](https://github.com/Valink-Solutions/ozhi/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/Valink-Solutions/ozhi/actions/workflows/ci.yml)
[![Publish to NPM](https://github.com/Valink-Solutions/ozhi/actions/workflows/publish.yml/badge.svg?branch=master)](https://github.com/Valink-Solutions/ozhi/actions/workflows/publish.yml)
![NPM (prod) Dependency Version](https://img.shields.io/npm/dependency-version/%40valink-solutions-ltd%2Fozhi/%40valink-solutions-ltd%2Fozhi)

A comprehensive pluggable audit system for SvelteKit applications with seamless integration for Drizzle ORM, Better-Auth, Resend, and Stripe.

## Features

- 🔌 **Pluggable Architecture** - Easy to integrate without modifying existing code
- 🔐 **Automatic Context Capture** - User, session, IP, and request details via AsyncLocalStorage
- 📝 **Type-Safe Events** - Full TypeScript support with categorized events
- 🗄️ **Optimized Database Schema** - Efficient Drizzle schema with proper indexing
- 🪝 **Multiple Integration Points** - Middleware, wrapper functions and decorators (future)
- 🔔 **Built-in Plugins** - Notifications, Stripe enrichment, and security monitoring
- 🎯 **Flexible Targeting** - Track changes to any entity with before/after states

## Installation & Usage

### 1. Install

```bash
pnpm add @valink-solutions-ltd/ozhi
```

### 2. Setup drizzle schema

In your `src/lib/server/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { postgres } from 'drizzle-orm/postgres-js';
import * as schema from "./schema";
import * as ohziSchema from '@valink-solutions-ltd/ozhi/db/schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, {{ ...schema, ...ohziSchema }});
```

### 3. Configure Hooks

In your `src/hooks.server.ts`:

```typescript
import { createAuditMiddleware } from '@valink-solutions-ltd/ozhi';
import { auditor } from '@valink-solutions-ltd/ozhi';
import {
	createNotificationPlugin,
	createStripePlugin,
	createSecurityPlugin
} from '@valink-solutions-ltd/ozhi/plugins';
import { resend } from 'resend';
import { stripe } from 'stripe';

// Configure plugins (optional)
auditor.registerPlugin(
	createSecurityPlugin({
		maxFailedAttempts: 5,
		timeWindowMs: 300000 // 5 minutes
	})
);

auditor.registerPlugin(
	createNotificationPlugin({
		resend,
		notifyEmail: 'security@yourdomain.com',
		severityThreshold: AuditSeverity.HIGH
	})
);

auditor.registerPlugin(createStripePlugin({ stripe }));

// Initialize auditor
await auditor.initialize();

// Apply middleware
export const handle = createAuditMiddleware();
```

### 4. Start Auditing

#### Manual Audit Logging

```typescript
import { audit } from '@valink-solutions-ltd/ozhi';
import { AuditCategory, AuditResult } from '@valink-solutions-ltd/ozhi/types';

// Log a successful action
await audit({
	action: 'user.profile.updated',
	category: AuditCategory.DATA_MODIFICATION,
	result: AuditResult.SUCCESS,
	target: {
		type: 'user',
		id: userId,
		name: userEmail
	},
	changes: {
		before: { role: 'user' },
		after: { role: 'admin' },
		fields: ['role']
	}
});
```

#### Wrapped Server Endpoints

```typescript
import { withAudit } from '@valink-solutions-ltd/ozhi/middleware';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = withAudit(
	'invoice.complete',
	AuditCategory.INVOICE,
	async ({ request }) => {
		const { invoiceId } = await request.json();
		// Your business logic here
		return json({ success: true });
	}
);
```

#### Form Actions with Decorators

```typescript
import { auditFormAction } from '@valink-solutions-ltd/ozhi/helpers';
import type { Actions } from './$types';

export const actions = {
	delete: auditFormAction(
		'user.delete',
		AuditCategory.USER_MANAGEMENT
	)(async ({ params }) => {
		// Delete user logic
	})
} satisfies Actions;
```

## Better-Auth Integration

Automatically audit authentication events:

```typescript
import { betterAuth } from 'better-auth';
import { audit } from '@valink-solutions-ltd/ozhi';
import { AuditCategory, AuditResult } from '@valink-solutions-ltd/ozhi/types';

export const auth = betterAuth({
	// ... your config
	hooks: {
		after: {
			signIn: async ({ user, session }) => {
				await audit({
					action: 'auth.signin',
					category: AuditCategory.AUTH,
					result: AuditResult.SUCCESS,
					target: {
						type: 'user',
						id: user.id,
						name: user.email
					}
				});
			},
			signOut: async ({ user }) => {
				await audit({
					action: 'auth.signout',
					category: AuditCategory.AUTH,
					result: AuditResult.SUCCESS,
					target: {
						type: 'user',
						id: user.id,
						name: user.email
					}
				});
			}
		}
	}
});
```

## Audit Categories

- `AUTH` - Authentication events (login, logout, password changes)
- `PAYMENT` - Payment processing events
- `DATA_ACCESS` - Read operations on sensitive data
- `DATA_MODIFICATION` - Create, update, delete operations
- `SYSTEM` - System-level events
- `INVOICE` - Invoice-related operations
- `USER_MANAGEMENT` - User administration events

## Severity Levels

- `LOW` - Routine operations
- `MEDIUM` - Important business operations
- `HIGH` - Security-relevant or critical operations
- `CRITICAL` - High-risk operations requiring immediate attention

## Plugin Development

Create custom plugins by implementing the `AuditPlugin` interface:

```typescript
import type { AuditPlugin, AuditEvent } from '@valink-solutions-ltd/ozhi/types';

export function createCustomPlugin(): AuditPlugin {
	return {
		name: 'custom-plugin',

		initialize: async () => {
			// Setup code
		},

		beforeAudit: async (event: AuditEvent) => {
			// Modify or cancel events
			// Return null to cancel, or modified event
			return event;
		},

		afterAudit: async (event: AuditEvent) => {
			// React to audit events
		}
	};
}
```

## Built-in Plugins

### Notification Plugin

Sends email alerts for high-severity events:

```typescript
createNotificationPlugin({
	resend: resendClient,
	notifyEmail: 'admin@yourdomain.com',
	severityThreshold: AuditSeverity.HIGH // Only alert for high and critical
});
```

### Security Plugin

Monitors and alerts on suspicious activity:

```typescript
createSecurityPlugin({
	maxFailedAttempts: 5,
	timeWindowMs: 300000 // 5 minutes
});
```

### Stripe Plugin

Enriches payment events with Stripe metadata:

```typescript
createStripePlugin({
	stripe: stripeClient
});
```

## Querying Audit Logs

Use the built-in query builder:

```typescript
import { queryAuditLogs } from '@valink-solutions-ltd/ozhi/query-builder';

const logs = await queryAuditLogs({
	userId: 'user_123',
	category: AuditCategory.PAYMENT,
	severity: [AuditSeverity.HIGH, AuditSeverity.CRITICAL],
	startDate: new Date('2024-01-01'),
	endDate: new Date('2024-12-31'),
	limit: 50,
	offset: 0
});
```

## Best Practices

1. **Use Consistent Action Names**: Follow a dot-notation pattern (e.g., `entity.action.detail`)
2. **Include Context**: Always provide meaningful target information
3. **Track Changes**: Use the changes object for data modifications
4. **Set Appropriate Severity**: Let critical events trigger notifications
5. **Leverage Metadata**: Store additional context in metadata fields

## Security Considerations

- Audit logs are tamper-evident once written
- Consider encrypting sensitive data in metadata fields
- Implement retention policies for compliance
- Use read-only database users for audit queries
- Monitor for unusual patterns using the security plugin

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
	AuditEvent,
	AuditContext,
	AuditCategory,
	AuditSeverity,
	AuditResult,
	AuditTarget,
	AuditChanges,
	AuditPlugin
} from '@valink-solutions-ltd/ozhi/types';
```

## Architecture

The system uses:

- **AsyncLocalStorage** for request-scoped context
- **Drizzle ORM** for database operations
- **Plugin Architecture** for extensibility
- **Middleware Pattern** for automatic context injection

## License

MIT

## Contributing

Contributions are welcome! Please ensure all changes maintain backward compatibility and include appropriate tests.

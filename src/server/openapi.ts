const nullableString = { type: ['string', 'null'] };
const nullableInteger = { type: ['integer', 'null'] };

const jsonBody = (schema: string, required = true) => ({
  required,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
});

const jsonResponse = (description: string, schema: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
});

const errorRef = (name: string) => ({ $ref: `#/components/responses/${name}` });

export const openapiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Brightloom API',
    version: '1.0.0',
    summary: 'Tasks, projects and billing for small teams.',
    description:
      'The HTTP API behind the Brightloom web app. Every endpoint apart from the login call and ' +
      'the billing webhook needs the session cookie that POST /api/v1/auth/login sets.',
    license: { name: 'MIT', identifier: 'MIT' },
    contact: { name: 'Brightloom engineering', email: 'engineering@brightloom.test' },
  },
  servers: [{ url: 'http://localhost:4100', description: 'Local development server' }],
  tags: [
    { name: 'Auth', description: 'Signing in and out, and reading the current user.' },
    { name: 'Organisation', description: 'The organisation record and its members.' },
    { name: 'Projects', description: 'Project list and project maintenance.' },
    { name: 'Tasks', description: 'Tasks, comments and completion statistics.' },
    { name: 'Sync', description: 'Batched task operations sent by the web app.' },
    { name: 'Billing', description: 'Plan, invoices and inbound payment events.' },
    { name: 'Utilities', description: 'Small helpers used by the settings screen.' },
  ],
  security: [{ cookieAuth: [] }],
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        operationId: 'login',
        summary: 'Sign in with an email address and password',
        security: [],
        requestBody: jsonBody('LoginRequest'),
        responses: {
          '200': jsonResponse('The signed in user and organisation', 'SessionResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'logout',
        summary: 'Sign out and clear the session cookie',
        security: [],
        responses: {
          '200': jsonResponse('The session was cleared', 'OkResponse'),
          '400': errorRef('BadRequest'),
        },
      },
    },
    '/api/v1/me': {
      get: {
        tags: ['Auth'],
        operationId: 'getCurrentUser',
        summary: 'Read the signed in user and organisation',
        responses: {
          '200': jsonResponse('The current user and organisation', 'SessionResponse'),
          '401': errorRef('Unauthorized'),
        },
      },
      patch: {
        tags: ['Auth'],
        operationId: 'updateCurrentUser',
        summary: 'Update the signed in user profile',
        requestBody: jsonBody('ProfileUpdateRequest'),
        responses: {
          '200': jsonResponse('The updated user', 'UserResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/org': {
      get: {
        tags: ['Organisation'],
        operationId: 'getOrganisation',
        summary: 'Read the organisation and its members',
        responses: {
          '200': jsonResponse('The organisation and its members', 'OrgWithMembersResponse'),
          '401': errorRef('Unauthorized'),
        },
      },
      patch: {
        tags: ['Organisation'],
        operationId: 'updateOrganisation',
        summary: 'Rename the organisation',
        requestBody: jsonBody('OrgUpdateRequest'),
        responses: {
          '200': jsonResponse('The updated organisation', 'OrgResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/v1/projects': {
      get: {
        tags: ['Projects'],
        operationId: 'listProjects',
        summary: 'List the projects in the organisation',
        responses: {
          '200': jsonResponse('The organisation projects', 'ProjectListResponse'),
          '401': errorRef('Unauthorized'),
        },
      },
      post: {
        tags: ['Projects'],
        operationId: 'createProject',
        summary: 'Create a project',
        requestBody: jsonBody('ProjectCreateRequest'),
        responses: {
          '201': jsonResponse('The created project', 'ProjectResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/projects/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Project id',
          schema: { type: 'integer' },
        },
      ],
      patch: {
        tags: ['Projects'],
        operationId: 'updateProject',
        summary: 'Rename, recolour or archive a project',
        requestBody: jsonBody('ProjectUpdateRequest'),
        responses: {
          '200': jsonResponse('The updated project', 'ProjectResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
      delete: {
        tags: ['Projects'],
        operationId: 'deleteProject',
        summary: 'Delete a project',
        responses: {
          '200': jsonResponse('The project was deleted', 'OkResponse'),
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/v1/tasks': {
      get: {
        tags: ['Tasks'],
        operationId: 'listTasks',
        summary: 'List tasks with optional filters',
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            description: 'Only tasks in this project',
            schema: { type: 'integer' },
          },
          {
            name: 'assignee_id',
            in: 'query',
            description: 'Only tasks assigned to this user',
            schema: { type: 'integer' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Only tasks in this status',
            schema: { type: 'string', enum: ['open', 'done'] },
          },
          {
            name: 'due',
            in: 'query',
            description: 'A due date window relative to today',
            schema: { type: 'string', enum: ['today', 'upcoming', 'overdue'] },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'How many tasks to return',
            schema: { type: 'integer', default: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'How many tasks to skip',
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          '200': jsonResponse('A page of tasks', 'TaskListResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
      post: {
        tags: ['Tasks'],
        operationId: 'createTask',
        summary: 'Create a task',
        requestBody: jsonBody('TaskCreateRequest'),
        responses: {
          '201': jsonResponse('The created task', 'TaskResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/tasks/completed/stats': {
      get: {
        tags: ['Tasks'],
        operationId: 'completedTaskStats',
        summary: 'Count completed tasks per day for the last fourteen days',
        responses: {
          '200': jsonResponse('One entry per day, oldest first', 'CompletedStatsResponse'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/tasks/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Task id',
          schema: { type: 'integer' },
        },
      ],
      get: {
        tags: ['Tasks'],
        operationId: 'getTask',
        summary: 'Read one task with its comments',
        responses: {
          '200': jsonResponse('The task and its comments', 'TaskDetailResponse'),
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
      patch: {
        tags: ['Tasks'],
        operationId: 'updateTask',
        summary: 'Edit, complete or reschedule a task',
        requestBody: jsonBody('TaskUpdateRequest'),
        responses: {
          '200': jsonResponse('The updated task', 'TaskResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
      delete: {
        tags: ['Tasks'],
        operationId: 'deleteTask',
        summary: 'Delete a task and its comments',
        responses: {
          '200': jsonResponse('The task was deleted', 'OkResponse'),
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/v1/tasks/{id}/comments': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Task id',
          schema: { type: 'integer' },
        },
      ],
      post: {
        tags: ['Tasks'],
        operationId: 'createComment',
        summary: 'Add a comment to a task',
        requestBody: jsonBody('CommentCreateRequest'),
        responses: {
          '201': jsonResponse('The created comment', 'CommentResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/v1/sync': {
      post: {
        tags: ['Sync'],
        operationId: 'syncTasks',
        summary: 'Apply a batch of task operations',
        requestBody: jsonBody('SyncRequest'),
        responses: {
          '200': jsonResponse('One result per operation, in order', 'SyncResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/guess_timezone': {
      post: {
        tags: ['Utilities'],
        operationId: 'guessTimezone',
        summary: 'Suggest a timezone name for an offset from UTC',
        requestBody: jsonBody('GuessTimezoneRequest'),
        responses: {
          '200': jsonResponse('The suggested timezone', 'GuessTimezoneResponse'),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['Utilities'],
        operationId: 'health',
        summary: 'Report that the server is up',
        security: [],
        responses: {
          '200': jsonResponse('The server is up', 'HealthResponse'),
          '400': errorRef('BadRequest'),
        },
      },
    },
    '/api/v1/billing/subscription': {
      get: {
        tags: ['Billing'],
        operationId: 'getSubscription',
        summary: 'Read the plan, seat count and next invoice',
        responses: {
          '200': jsonResponse('The current subscription', 'SubscriptionResponse'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/billing/invoices': {
      get: {
        tags: ['Billing'],
        operationId: 'listInvoices',
        summary: 'List the invoices for the organisation',
        responses: {
          '200': jsonResponse('The invoices, newest period first', 'InvoiceListResponse'),
          '401': errorRef('Unauthorized'),
        },
      },
    },
    '/api/v1/billing/invoices/{id}/pdf': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Invoice id',
          schema: { type: 'integer' },
        },
      ],
      get: {
        tags: ['Billing'],
        operationId: 'downloadInvoicePdf',
        summary: 'Download an invoice PDF',
        responses: {
          '200': {
            description: 'The invoice PDF',
            content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
          },
          '401': errorRef('Unauthorized'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/v1/billing/webhook': {
      post: {
        tags: ['Billing'],
        operationId: 'billingWebhook',
        summary: 'Receive a payment provider event',
        security: [],
        requestBody: jsonBody('WebhookEvent'),
        responses: {
          '200': jsonResponse('The event was accepted', 'WebhookResponse'),
          '400': errorRef('BadRequest'),
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Utilities'],
        operationId: 'getOpenapiDocument',
        summary: 'Serve this document',
        security: [],
        responses: {
          '200': {
            description: 'The OpenAPI document',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          '400': errorRef('BadRequest'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'bl_session',
        description: 'The session cookie set by POST /api/v1/auth/login.',
      },
    },
    responses: {
      BadRequest: jsonResponse('The request was not valid', 'ErrorResponse'),
      Unauthorized: jsonResponse('No valid session cookie was sent', 'ErrorResponse'),
      Forbidden: jsonResponse('The session may not perform this action', 'ErrorResponse'),
      NotFound: jsonResponse('No record matches that id', 'ErrorResponse'),
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', examples: ['not_found'] },
              message: { type: 'string', examples: ['That task does not exist'] },
            },
          },
        },
      },
      OkResponse: {
        type: 'object',
        required: ['ok'],
        properties: { ok: { type: 'boolean' } },
      },
      HealthResponse: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', examples: ['ok'] } },
      },
      User: {
        type: 'object',
        required: ['id', 'org_id', 'email', 'name', 'role', 'timezone'],
        properties: {
          id: { type: 'integer' },
          org_id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'member'] },
          timezone: { type: 'string', examples: ['Europe/London'] },
        },
      },
      Member: {
        type: 'object',
        required: ['id', 'name', 'email', 'role'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['owner', 'member'] },
        },
      },
      Org: {
        type: 'object',
        required: ['id', 'slug', 'name', 'plan'],
        properties: {
          id: { type: 'integer' },
          slug: { type: 'string' },
          name: { type: 'string' },
          plan: { type: 'string', enum: ['starter', 'team', 'enterprise'] },
        },
      },
      Project: {
        type: 'object',
        required: ['id', 'org_id', 'name', 'color', 'archived', 'created_at', 'open_task_count'],
        properties: {
          id: { type: 'integer' },
          org_id: { type: 'integer' },
          name: { type: 'string' },
          color: { type: 'string', enum: ['blue', 'amber', 'violet', 'green', 'rose', 'slate'] },
          archived: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          open_task_count: { type: 'integer' },
        },
      },
      Task: {
        type: 'object',
        required: [
          'id',
          'org_id',
          'project_id',
          'title',
          'description',
          'status',
          'priority',
          'due_date',
          'assignee_id',
          'created_at',
          'completed_at',
        ],
        properties: {
          id: { type: 'integer' },
          org_id: { type: 'integer' },
          project_id: nullableInteger,
          project_name: nullableString,
          project_color: nullableString,
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['open', 'done'] },
          priority: { type: 'integer', minimum: 1, maximum: 4 },
          due_date: { type: ['string', 'null'], examples: ['2026-01-31'] },
          assignee_id: nullableInteger,
          assignee_name: nullableString,
          created_at: { type: 'string', format: 'date-time' },
          completed_at: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'task_id', 'author_id', 'author_name', 'body', 'created_at'],
        properties: {
          id: { type: 'integer' },
          task_id: { type: 'integer' },
          author_id: { type: 'integer' },
          author_name: { type: 'string' },
          body: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Invoice: {
        type: 'object',
        required: ['id', 'org_id', 'amount_cents', 'status', 'period', 'issued_at'],
        properties: {
          id: { type: 'integer' },
          org_id: { type: 'integer' },
          amount_cents: { type: 'integer' },
          status: { type: 'string', enum: ['paid', 'open', 'void'] },
          period: { type: 'string', examples: ['2026-08'] },
          issued_at: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', examples: ['priya@brightloom.test'] },
          password: { type: 'string', minLength: 1 },
        },
      },
      SessionResponse: {
        type: 'object',
        required: ['user', 'org'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          org: { $ref: '#/components/schemas/Org' },
        },
      },
      UserResponse: {
        type: 'object',
        required: ['user'],
        properties: { user: { $ref: '#/components/schemas/User' } },
      },
      ProfileUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          timezone: { type: 'string', examples: ['Europe/London'] },
        },
      },
      OrgUpdateRequest: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
      OrgResponse: {
        type: 'object',
        required: ['org'],
        properties: { org: { $ref: '#/components/schemas/Org' } },
      },
      OrgWithMembersResponse: {
        type: 'object',
        required: ['org', 'members'],
        properties: {
          org: { $ref: '#/components/schemas/Org' },
          members: { type: 'array', items: { $ref: '#/components/schemas/Member' } },
        },
      },
      ProjectCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 120 },
          color: { type: 'string', enum: ['blue', 'amber', 'violet', 'green', 'rose', 'slate'] },
        },
      },
      ProjectUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 120 },
          color: { type: 'string', enum: ['blue', 'amber', 'violet', 'green', 'rose', 'slate'] },
          archived: { type: 'boolean' },
        },
      },
      ProjectResponse: {
        type: 'object',
        required: ['project'],
        properties: { project: { $ref: '#/components/schemas/Project' } },
      },
      ProjectListResponse: {
        type: 'object',
        required: ['projects'],
        properties: {
          projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
        },
      },
      TaskCreateRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          project_id: nullableInteger,
          priority: { type: 'integer', minimum: 1, maximum: 4 },
          due_date: { type: ['string', 'null'], examples: ['2026-01-31'] },
          assignee_id: nullableInteger,
        },
      },
      TaskUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['open', 'done'] },
          priority: { type: 'integer', minimum: 1, maximum: 4 },
          due_date: { type: ['string', 'null'], examples: ['2026-01-31'] },
          assignee_id: nullableInteger,
        },
      },
      TaskResponse: {
        type: 'object',
        required: ['task'],
        properties: { task: { $ref: '#/components/schemas/Task' } },
      },
      TaskDetailResponse: {
        type: 'object',
        required: ['task', 'comments'],
        properties: {
          task: { $ref: '#/components/schemas/Task' },
          comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
        },
      },
      TaskListResponse: {
        type: 'object',
        required: ['tasks', 'total', 'limit', 'offset'],
        properties: {
          tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
      CommentCreateRequest: {
        type: 'object',
        required: ['body'],
        properties: { body: { type: 'string', maxLength: 2000 } },
      },
      CommentResponse: {
        type: 'object',
        required: ['comment'],
        properties: { comment: { $ref: '#/components/schemas/Comment' } },
      },
      CompletedStatsResponse: {
        type: 'object',
        required: ['days'],
        properties: {
          days: {
            type: 'array',
            items: {
              type: 'object',
              required: ['date', 'count'],
              properties: {
                date: { type: 'string', examples: ['2026-01-31'] },
                count: { type: 'integer' },
              },
            },
          },
        },
      },
      SyncRequest: {
        type: 'object',
        required: ['ops'],
        properties: {
          ops: {
            type: 'array',
            maxItems: 200,
            items: {
              type: 'object',
              required: ['op', 'task_id'],
              properties: {
                op: { type: 'string', enum: ['complete', 'reopen', 'reschedule', 'delete'] },
                task_id: { type: 'integer' },
                due_date: { type: 'string', examples: ['2026-01-31'] },
              },
            },
          },
        },
      },
      SyncResponse: {
        type: 'object',
        required: ['applied', 'results'],
        properties: {
          applied: { type: 'integer' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              required: ['task_id', 'op', 'ok'],
              properties: {
                task_id: { type: 'integer' },
                op: { type: 'string' },
                ok: { type: 'boolean' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
      GuessTimezoneRequest: {
        type: 'object',
        required: ['offset_minutes'],
        properties: {
          offset_minutes: {
            type: 'integer',
            description: 'Minutes ahead of UTC. Kolkata is 330, New York is -300.',
            examples: [330],
          },
        },
      },
      GuessTimezoneResponse: {
        type: 'object',
        required: ['timezone', 'offset_minutes'],
        properties: {
          timezone: { type: 'string', examples: ['Asia/Kolkata'] },
          offset_minutes: { type: 'integer' },
        },
      },
      SubscriptionResponse: {
        type: 'object',
        required: ['plan', 'seats', 'seat_price_cents', 'next_invoice'],
        properties: {
          plan: { type: 'string', enum: ['starter', 'team', 'enterprise'] },
          seats: { type: 'integer' },
          seat_price_cents: { type: 'integer' },
          next_invoice: {
            type: 'object',
            required: ['period', 'amount_cents', 'due_date'],
            properties: {
              period: { type: 'string', examples: ['2026-10'] },
              amount_cents: { type: 'integer' },
              due_date: { type: 'string', examples: ['2026-10-01'] },
            },
          },
        },
      },
      InvoiceListResponse: {
        type: 'object',
        required: ['invoices'],
        properties: {
          invoices: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
        },
      },
      WebhookEvent: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: ['subscription.updated', 'invoice.paid'],
          },
          org_slug: { type: 'string', examples: ['brightloom'] },
          plan: { type: 'string', enum: ['starter', 'team', 'enterprise'] },
          invoice_id: { type: 'integer' },
        },
      },
      WebhookResponse: {
        type: 'object',
        required: ['received'],
        properties: { received: { type: 'boolean' } },
      },
    },
  },
};

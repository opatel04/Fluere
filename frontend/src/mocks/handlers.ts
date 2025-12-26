import { http, HttpResponse } from 'msw';
import users from './fixtures/users.json';
import clients from './fixtures/clients.json';
import tasks from './fixtures/tasks.json';
import emails from './fixtures/emails.json';
import aiSuggestions from './fixtures/ai_suggestions.json';

export const handlers = [
  // Auth
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    // Mock validation
    if (body.email && body.password) {
      return HttpResponse.json({
        success: true,
        data: { user: users[0] },
      });
    }
    return HttpResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get('/api/v1/users/profile', () => {
    return HttpResponse.json({
      success: true,
      data: { user: users[0] },
    });
  }),

  // Clients
  http.get('/api/v1/clients', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let filteredClients = [...clients];

    if (status) {
      filteredClients = filteredClients.filter((c) => c.status === status);
    }

    if (search) {
      filteredClients = filteredClients.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedClients = filteredClients.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        clients: paginatedClients,
        meta: {
          page,
          limit,
          total: filteredClients.length,
        },
      },
    });
  }),

  http.get('/api/v1/clients/:id', ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) {
      return HttpResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: {
        client,
        recent_activity: [],
        emails_count: client.total_emails,
        tasks_count: client.total_tasks,
      },
    });
  }),

  // Tasks
  http.get('/api/v1/tasks', ({ request }) => {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');

    let filteredTasks = [...tasks];

    if (clientId) {
      filteredTasks = filteredTasks.filter((t) => t.client_id === clientId);
    }

    if (status) {
      filteredTasks = filteredTasks.filter((t) => t.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: {
        tasks: filteredTasks,
        meta: { page, limit: 20, total: filteredTasks.length },
      },
    });
  }),

  http.get('/api/v1/tasks/:id', ({ params }) => {
    const task = tasks.find((t: any) => t.id === params.id);
    if (!task) {
      return HttpResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: { task },
    });
  }),

  http.post('/api/v1/tasks', async ({ request }) => {
    const body = await request.json() as any;
    const newTask = {
      id: `t_${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: { task: newTask },
    });
  }),

  http.put('/api/v1/tasks/:id', async ({ params, request }) => {
    const body = await request.json() as any;
    const task = tasks.find((t: any) => t.id === params.id);
    if (!task) {
      return HttpResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    const updatedTask = {
      ...task,
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: { task: updatedTask },
    });
  }),

  http.delete('/api/v1/tasks/:id', ({ params }) => {
    const task = tasks.find((t: any) => t.id === params.id);
    if (!task) {
      return HttpResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: { message: 'Task deleted' },
    });
  }),

  // Emails - inbound endpoint (used by frontend)
  http.get('/api/v1/emails/inbound', ({ request }) => {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status');

    let filteredEmails = emails.map((e: any) => ({
      id: e.id,
      subject: e.subject,
      body: e.body_html || e.preview || '',
      from: e.from,
      to: Array.isArray(e.to) ? e.to.join(', ') : e.to,
      date: e.timestamp || e.date || new Date().toISOString(),
      client_id: e.client_id,
      processing_status: e.processed ? 'processed' : 'pending',
      created_at: e.created_at || e.timestamp || new Date().toISOString(),
      updated_at: e.updated_at || e.timestamp || new Date().toISOString(),
    }));

    if (clientId) {
      filteredEmails = filteredEmails.filter((e) => e.client_id === clientId);
    }

    if (status) {
      const statusMap: Record<string, string> = { pending: 'pending', processed: 'processed' };
      filteredEmails = filteredEmails.filter((e) => e.processing_status === status);
    }

    return HttpResponse.json({
      success: true,
      data: {
        emails: filteredEmails,
        total: filteredEmails.length,
        limit: 50,
        offset: 0,
      },
    });
  }),

  http.get('/api/v1/emails/inbound/:id', ({ params }) => {
    const email = emails.find((e: any) => e.id === params.id);
    if (!email) {
      return HttpResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: {
        id: email.id,
        subject: email.subject,
        body: email.body_html || email.preview || '',
        from: email.from,
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        received_at: email.timestamp || new Date().toISOString(),
        client_id: email.client_id,
        processing_status: email.processed ? 'processed' : 'pending',
        created_at: email.timestamp || new Date().toISOString(),
        updated_at: email.timestamp || new Date().toISOString(),
      },
    });
  }),

  // Emails - legacy endpoint
  http.get('/api/v1/emails', ({ request }) => {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status');

    let filteredEmails = emails.map((e: any) => ({
      id: e.id,
      subject: e.subject,
      body: e.body_html || e.preview || '',
      from: e.from,
      to: Array.isArray(e.to) ? e.to.join(', ') : e.to,
      date: e.timestamp || e.date || new Date().toISOString(),
      client_id: e.client_id,
      status: e.status || (e.processed ? 'read' : 'unread'),
      created_at: e.created_at || e.timestamp || new Date().toISOString(),
      updated_at: e.updated_at || e.timestamp || new Date().toISOString(),
    }));

    if (clientId) {
      filteredEmails = filteredEmails.filter((e) => e.client_id === clientId);
    }

    if (status) {
      filteredEmails = filteredEmails.filter((e) => e.status === status);
    }

    return HttpResponse.json({
      success: true,
      data: { emails: filteredEmails },
    });
  }),

  http.get('/api/v1/emails/:id', ({ params }) => {
    const email = emails.find((e: any) => e.id === params.id);
    if (!email) {
      return HttpResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
    const transformedEmail = {
      id: email.id,
      subject: email.subject,
      body: email.body_html || email.preview || '',
      from: email.from,
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      date: email.timestamp || new Date().toISOString(),
      client_id: email.client_id,
      status: (email.processed ? 'read' : 'unread'),
      created_at: email.timestamp || new Date().toISOString(),
      updated_at: email.timestamp || new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: { email: transformedEmail },
    });
  }),

  http.patch('/api/v1/emails/:id', async ({ params, request }) => {
    const body = await request.json() as any;
    const email = emails.find((e: any) => e.id === params.id);
    if (!email) {
      return HttpResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
    const updatedEmail = {
      id: email.id,
      subject: email.subject,
      body: email.body_html || email.preview || '',
      from: email.from,
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      date: email.timestamp || new Date().toISOString(),
      client_id: email.client_id,
      status: body.status || (email.processed ? 'read' : 'unread'),
      created_at: email.timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: { email: updatedEmail },
    });
  }),

  http.get('/api/v1/clients/:id/emails', ({ params, request }) => {
    const url = new URL(request.url);
    const processed = url.searchParams.get('processed');
    const clientEmails = emails.filter((e) => e.client_id === params.id);

    let filteredEmails = clientEmails;
    if (processed !== null) {
      filteredEmails = clientEmails.filter(
        (e) => e.processed === (processed === 'true')
      );
    }

    return HttpResponse.json({
      success: true,
      data: { emails: filteredEmails },
    });
  }),

  // AI Extraction
  http.post('/api/v1/emails/:id/extract-tasks', async ({ params }) => {
    const emailId = params.id as string;
    const suggestions = aiSuggestions.filter((s) => s.email_id === emailId);
    return HttpResponse.json({
      success: true,
      data: { suggestions },
    });
  }),

  http.post('/api/v1/ai/extract-manual', async ({ request }) => {
    const body = await request.json() as { email_id: string };
    return HttpResponse.json({
      success: true,
      data: {
        suggested_tasks: aiSuggestions.filter(
          (s) => s.email_id === body.email_id
        ),
      },
    });
  }),
];


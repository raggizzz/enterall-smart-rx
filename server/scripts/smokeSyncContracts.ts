const API_BASE = process.env.SMOKE_API_BASE || 'http://localhost:3000';
const HOSPITAL_ID = process.env.SMOKE_HOSPITAL_ID || 'e28659d2-030a-48c3-a421-25e836dcfeb2';
const USER_IDENTIFIER = process.env.SMOKE_IDENTIFIER || '100001';
const USER_PASSWORD = process.env.SMOKE_PASSWORD || '12345678';

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, init);
  const text = await response.text();
  let body: unknown = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
};

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  const health = await request('/health');
  assert(health.ok, 'Healthcheck falhou');

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      hospitalId: HOSPITAL_ID,
      identifier: USER_IDENTIFIER,
      password: USER_PASSWORD,
      role: 'general_manager',
    }),
  });
  assert(login.ok, 'Login de smoke falhou');

  const loginBody = login.body as { token?: unknown; session?: { access_token?: unknown } };
  const token = String(loginBody.token || loginBody.session?.access_token || '');
  assert(token, 'Login de smoke nao retornou token');

  const authHeaders = {
    authorization: `Bearer ${token}`,
  };

  const key = crypto.randomUUID();
  const createPayload = {
    name: `Hospital Smoke ${Date.now()}`,
    isActive: true,
  };

  const createA = await request('/api/hospitals', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
      'x-idempotency-key': key,
    },
    body: JSON.stringify(createPayload),
  });

  const createB = await request('/api/hospitals', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
      'x-idempotency-key': key,
    },
    body: JSON.stringify(createPayload),
  });

  assert(createA.ok && createB.ok, 'Criacao idempotente falhou');

  const createdId = String((createA.body as Record<string, unknown>).id);
  const repeatedId = String((createB.body as Record<string, unknown>).id);
  assert(createdId === repeatedId, 'A idempotencia nao devolveu o mesmo registro');

  const list = await request('/api/hospitals');
  assert(list.ok, 'Listagem de hospitais falhou');

  const created = (list.body as Array<Record<string, unknown>>).find((item) => item.id === createdId);
  assert(created, 'Hospital criado nao encontrado');

  const updateKey = crypto.randomUUID();
  const updatePayload = {
    name: `${createPayload.name} atualizado`,
    version: created.version,
  };

  const updateA = await request(`/api/hospitals/${createdId}`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
      'x-idempotency-key': updateKey,
      'x-expected-version': String(created.version),
    },
    body: JSON.stringify(updatePayload),
  });

  const updateB = await request(`/api/hospitals/${createdId}`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
      'x-idempotency-key': updateKey,
      'x-expected-version': String(created.version),
    },
    body: JSON.stringify(updatePayload),
  });

  assert(updateA.ok && updateB.ok, 'Atualizacao idempotente falhou');

  const deleteKey = crypto.randomUUID();
  const deletion = await request(`/api/hospitals/${createdId}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders,
      'x-idempotency-key': deleteKey,
    },
  });

  assert(deletion.ok, 'Remocao de hospital falhou');
  console.log('smoke-sync-contracts-ok');
};

run().catch((error) => {
  console.error('smoke-sync-contracts-failed');
  console.error(error);
  process.exit(1);
});

const API_BASE = process.env.SMOKE_API_BASE || 'http://localhost:3000';

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

  const key = crypto.randomUUID();
  const createPayload = {
    name: `Hospital Smoke ${Date.now()}`,
    isActive: true,
  };

  const createA = await request('/api/hospitals', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': key,
    },
    body: JSON.stringify(createPayload),
  });

  const createB = await request('/api/hospitals', {
    method: 'POST',
    headers: {
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
      'content-type': 'application/json',
      'x-idempotency-key': updateKey,
      'x-expected-version': String(created.version),
    },
    body: JSON.stringify(updatePayload),
  });

  const updateB = await request(`/api/hospitals/${createdId}`, {
    method: 'PUT',
    headers: {
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

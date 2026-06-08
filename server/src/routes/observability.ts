import { Router } from 'express';
import { clientErrorsTotal, clientEventsTotal } from '../lib/metrics';

const router = Router();

const asString = (value: unknown, fallback = 'unknown') =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, 120)
    : fallback;

const asBooleanLabel = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' && ['true', 'false'].includes(value)) return value;
  return 'unknown';
};

const getProp = (event: Record<string, unknown>, key: string, fallback = 'unknown') => {
  const props = event.props && typeof event.props === 'object'
    ? event.props as Record<string, unknown>
    : {};
  return asString(event[key] ?? props[key], fallback);
};

const normalizeEvents = (body: unknown) => {
  if (body && typeof body === 'object' && 'events' in (body as Record<string, unknown>)) {
    const events = (body as { events?: unknown }).events;
    return Array.isArray(events) ? events : [];
  }

  return body ? [body] : [];
};

router.post('/', (req, res) => {
  const events = normalizeEvents(req.body);
  let accepted = 0;

  events.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const event = raw as Record<string, unknown>;
    const name = asString(event.name || event.type, 'unknown');
    const route = asString(event.route, 'unknown');
    const role = asString(event.role, 'anonymous');
    const online = asBooleanLabel(event.online);
    const serverReachable = asBooleanLabel(event.serverReachable);

    clientEventsTotal.inc({
      event: name,
      route,
      role,
      online,
      server_reachable: serverReachable,
    });

    if (name === 'client_error' || name === 'api_error') {
      clientErrorsTotal.inc({
        source: getProp(event, 'source', name),
        route,
        role,
      });
    }

    console.log(JSON.stringify({
      level: name === 'client_error' || name === 'api_error' ? 'error' : 'info',
      msg: 'client_event',
      event: name,
      route,
      role,
      online,
      serverReachable,
      props: event.props && typeof event.props === 'object' ? event.props : undefined,
      timestamp: event.timestamp,
    }));
    accepted += 1;
  });

  res.status(202).json({ accepted });
});

export default router;

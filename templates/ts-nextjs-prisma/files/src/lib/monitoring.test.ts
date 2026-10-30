import { describe, expect, test } from 'vitest';
import { errorFields, formatEvent, safePath } from './monitoring';

describe('monitoring signals', () => {
  test('one line of JSON with a time, the app and the event', () => {
    const line = formatEvent({ level: 'error', event: 'request.error', route: '/notes/[id]' }, new Date('2026-01-01T00:00:00Z'));
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toMatchObject({ time: '2026-01-01T00:00:00.000Z', level: 'error', event: 'request.error', route: '/notes/[id]' });
  });

  test('paths lose their query string and fragment, where signed links keep tokens', () => {
    expect(safePath('/report?who=abc.signature')).toBe('/report');
    expect(safePath('/a#section')).toBe('/a');
    expect(safePath('/plain')).toBe('/plain');
  });

  test('errors become bounded fields, and non-errors still report', () => {
    const fields = errorFields(new Error('x'.repeat(2000)));
    expect(fields.errorName).toBe('Error');
    expect(fields.message.length).toBe(500);
    expect((fields.stack ?? '').split('\n').length).toBeLessThanOrEqual(6);
    expect(errorFields('oops')).toEqual({ errorName: 'NonError', message: 'oops' });
  });
});

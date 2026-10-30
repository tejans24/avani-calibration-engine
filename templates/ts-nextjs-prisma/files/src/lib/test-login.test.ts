import { describe, expect, test } from 'vitest';
import { testLoginIdentity, testLoginProblem } from './test-login';

const LOCAL = { TEST_LOGIN: 'on', AVANI_STAGE: 'dev', DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/app_dev' };

describe('test login', () => {
  test('on locally, in dev, against a local database', () => {
    expect(testLoginProblem(LOCAL)).toBeNull();
    expect(testLoginIdentity(LOCAL)).toEqual({ userId: 'test-owner', role: 'owner' });
    expect(testLoginIdentity({ ...LOCAL, TEST_LOGIN: 'coordinator' })).toEqual({ userId: 'test-coordinator', role: 'coordinator' });
    expect(testLoginProblem({ ...LOCAL, DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/x' })).toBeNull();
  });

  test('off unless asked for', () => {
    for (const asked of [undefined, '', 'off', 'false', '0']) expect(testLoginProblem({ ...LOCAL, TEST_LOGIN: asked })).not.toBeNull();
    expect(testLoginProblem({ ...LOCAL, TEST_LOGIN: 'Robert; drop' })).toMatch(/role name/);
  });

  test('fails closed anywhere it could reach someone else or real data', () => {
    expect(testLoginProblem({ ...LOCAL, AVANI_STAGE: undefined })).toMatch(/AVANI_STAGE/);
    expect(testLoginProblem({ ...LOCAL, AVANI_STAGE: 'staging' })).toMatch(/AVANI_STAGE/);
    expect(testLoginProblem({ ...LOCAL, AVANI_STAGE: 'production' })).toMatch(/AVANI_STAGE/);
    expect(testLoginProblem({ ...LOCAL, VERCEL: '1' })).toMatch(/Vercel/);
    expect(testLoginProblem({ ...LOCAL, VERCEL_ENV: 'preview' })).toMatch(/Vercel/);
    expect(testLoginProblem({ ...LOCAL, DATABASE_URL: 'postgresql://u:p@db.neon.tech/app' })).toMatch(/this machine/);
    expect(testLoginProblem({ ...LOCAL, DATABASE_URL: undefined })).toMatch(/DATABASE_URL/);
    expect(testLoginIdentity({ ...LOCAL, VERCEL: '1' })).toBeNull();
  });
});

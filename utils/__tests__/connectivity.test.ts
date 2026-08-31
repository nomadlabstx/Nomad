import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOnlineHttpStatus } from '../connectivity.ts';

describe('isOnlineHttpStatus', () => {
  it('treats 204 and 2xx as online', () => {
    assert.equal(isOnlineHttpStatus(204), true);
    assert.equal(isOnlineHttpStatus(200), true);
  });

  it('treats opaque/error statuses as offline', () => {
    assert.equal(isOnlineHttpStatus(0), false);
    assert.equal(isOnlineHttpStatus(404), false);
    assert.equal(isOnlineHttpStatus(500), false);
  });
});

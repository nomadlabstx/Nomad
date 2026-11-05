import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getErrorMessage } from '../error-messages.ts';

describe('getErrorMessage', () => {
  it('maps offline route failures to a recoverable offline card', () => {
    const info = getErrorMessage(
      new Error('No internet connection and no cached route available. Please connect to the internet to calculate a new route.')
    );
    assert.equal(info.title, 'You Are Offline');
    assert.equal(info.actionLabel, 'Retry');
    assert.ok(info.suggestions.length >= 2);
  });

  it('maps Directions API failures to route calculation copy', () => {
    const info = getErrorMessage(new Error('Directions API error: OVER_QUERY_LIMIT'));
    assert.equal(info.title, 'Route Calculation Failed');
    assert.equal(info.actionLabel, 'Try Again');
  });
});

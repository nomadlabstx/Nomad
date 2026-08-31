import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeXml } from '../xml.ts';

describe('escapeXml', () => {
  it('escapes markup characters in trip names', () => {
    assert.equal(
      escapeXml(`Trip to Bob & Sue's <cafe>`),
      'Trip to Bob &amp; Sue&apos;s &lt;cafe&gt;'
    );
  });

  it('escapes quotes', () => {
    assert.equal(escapeXml('Say "hi"'), 'Say &quot;hi&quot;');
  });
});

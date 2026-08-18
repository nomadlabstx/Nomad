import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  directionWord,
  instructionIndicatesHighway,
  parseHighwayRefs,
  tokenizeInstruction,
} from '../highway-refs.ts';

describe('parseHighwayRefs', () => {
  it('finds an interstate with a compass letter', () => {
    const refs = parseHighwayRefs('Merge onto I-95 S');
    assert.equal(refs.length, 1);
    assert.equal(refs[0].kind, 'interstate');
    assert.equal(refs[0].number, '95');
    assert.equal(refs[0].direction, 'S');
  });

  it('finds a Connecticut state route', () => {
    const refs = parseHighwayRefs('Turn right onto CT-67 N/New Haven Rd');
    assert.equal(refs.length, 1);
    assert.equal(refs[0].kind, 'state');
    assert.equal(refs[0].state, 'CT');
    assert.equal(refs[0].number, '67');
    assert.equal(refs[0].direction, 'N');
  });

  it('finds a US highway', () => {
    const refs = parseHighwayRefs('Continue on US-1 N');
    assert.equal(refs.length, 1);
    assert.equal(refs[0].kind, 'us');
    assert.equal(refs[0].number, '1');
  });

  it('does not treat a street name as a route', () => {
    const refs = parseHighwayRefs('Head east on Tracy Terrace toward Skokorat St');
    assert.equal(refs.length, 0);
  });

  it('does not match IN without a hyphen', () => {
    const refs = parseHighwayRefs('Destination will be on the right in 5 miles');
    assert.equal(refs.length, 0);
  });
});

describe('tokenizeInstruction', () => {
  it('splits shields out of the sentence', () => {
    const parts = tokenizeInstruction('Merge onto I-91 N');
    assert.equal(parts[0].type, 'text');
    if (parts[0].type === 'text') {
      assert.equal(parts[0].value, 'Merge onto ');
    }
    assert.equal(parts[1].type, 'shield');
    if (parts[1].type === 'shield') {
      assert.equal(parts[1].ref.number, '91');
    }
  });

  it('puts a space before a slash that followed the route name', () => {
    const parts = tokenizeInstruction('Turn right onto CT-67 N/New Haven Rd');
    const last = parts[parts.length - 1];
    assert.equal(last.type, 'text');
    if (last.type === 'text') {
      assert.match(last.value, /^\s*\/\s*New Haven Rd$/);
    }
  });
});

describe('directionWord', () => {
  it('expands compass letters', () => {
    assert.equal(directionWord('S'), 'South');
    assert.equal(directionWord('north'), 'North');
  });
});

describe('instructionIndicatesHighway', () => {
  it('detects interstates even without the word highway', () => {
    assert.equal(instructionIndicatesHighway('Merge onto I-95 N'), true);
  });

  it('detects freeway wording', () => {
    assert.equal(instructionIndicatesHighway('Continue on the freeway'), true);
  });

  it('detects ramp maneuvers', () => {
    assert.equal(instructionIndicatesHighway('Keep left', 'ramp-left'), true);
  });

  it('does not flag a local street', () => {
    assert.equal(instructionIndicatesHighway('Head east on Tracy Terrace'), false);
  });
});

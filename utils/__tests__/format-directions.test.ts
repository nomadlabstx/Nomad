import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  continueOnInstruction,
  formatDirectionInstruction,
  formatDirectionInstructionText,
} from '../format-directions';

describe('formatDirectionInstruction', () => {
  it('preserves full words when bold wraps a single leading letter (toward)', () => {
    const html = 'Head <b>east</b> on <b>Tracy Terrace</b> toward <b>Skokorat St</b>';
    const result = formatDirectionInstruction(html);
    assert.equal(result.primary, 'Head east on Tracy Terrace toward Skokorat St');
    assert.equal(result.secondary, undefined);
    assert.match(result.primary, /\btoward\b/);
  });

  it('handles split-letter bold tags without eating characters', () => {
    const html = 'Head <b>east</b> on <b>Tracy Terrace</b> <b>t</b>oward <b>Skokorat St</b>';
    const result = formatDirectionInstruction(html);
    assert.equal(result.primary, 'Head east on Tracy Terrace toward Skokorat St');
  });

  it('inserts spaces across br-separated segments and Pass by hints', () => {
    const html =
      'Turn <b>right</b> onto <b>CT-67 N</b>/<b>New Haven Rd</b><br/>Continue to follow CT-67 N<br/>Pass by Subway';
    const result = formatDirectionInstruction(html);
    assert.equal(result.primary, 'Turn right onto CT-67 N');
    assert.equal(result.secondary, 'Continue to follow CT-67 N · Pass by Subway');
    assert.ok(!result.primary.includes('NPass'));
    assert.ok(!result.primary.includes('RdContinue'));
  });

  it('splits Destination hint glued after closing bold tag', () => {
    const html = 'Turn <b>left</b>Destination will be on the right';
    const result = formatDirectionInstruction(html);
    assert.equal(result.primary, 'Turn left');
    assert.equal(result.secondary, 'Destination will be on the right');
    assert.ok(!result.primary.includes('leftDestination'));
  });

  it('fixes RdContinue-style joins from adjacent bold segments', () => {
    const html = 'Turn <b>right</b> onto <b>Main Rd</b><b>Continue</b> straight';
    const result = formatDirectionInstructionText(html);
    assert.ok(result.includes('Main Rd'));
    assert.ok(!result.includes('RdContinue'));
  });

  it('decodes HTML entities', () => {
    const html = 'Turn <b>left</b> onto <b>Main &amp; Oak St</b>';
    const result = formatDirectionInstruction(html);
    assert.equal(result.primary, 'Turn left onto Main & Oak St');
  });

  it('avoids naive stripHtml gluing (leftDestination, NPass)', () => {
    const glued = 'Turn leftDestination will be on the right';
    assert.ok(glued.includes('leftDestination'));

    const html = 'Turn <b>left</b>Destination will be on the right';
    const result = formatDirectionInstruction(html);
    assert.ok(!result.primary.includes('leftDestination'));
    assert.equal(result.primary, 'Turn left');
  });

  it('returns empty primary for empty input', () => {
    assert.deepEqual(formatDirectionInstruction(''), { primary: '' });
  });

  it('keeps Pass by off the banner/TTS line', () => {
    const html =
      'Turn <b>right</b> onto <b>CT-67 N</b>/<b>New Haven Rd</b><br/>Pass by Subway';
    assert.equal(formatDirectionInstructionText(html), 'Turn right onto CT-67 N');
  });

  it('drops "via the ramp to …" from the banner', () => {
    const html = 'Merge onto <b>CT-8 N</b> via the ramp to Waterbury';
    assert.equal(formatDirectionInstructionText(html), 'Merge onto CT-8 N');
  });

  it('turns an entry maneuver into Continue on once you are on that road', () => {
    assert.equal(
      continueOnInstruction('Merge onto <b>CT-8 N</b> via the ramp to Waterbury'),
      'Continue on CT-8 N'
    );
    assert.equal(
      continueOnInstruction('Turn <b>right</b> onto <b>New Haven Rd</b>'),
      'Continue on New Haven Rd'
    );
  });

  it('capitalizes Exit and glues 30 A into 30A', () => {
    const html = 'Take <b>exit 30 A</b> onto <b>I-84 E</b>';
    assert.equal(formatDirectionInstructionText(html), 'Take Exit 30A onto I-84 E');
  });

  it('capitalizes exit when the suffix is already glued', () => {
    const html = 'Take <b>exit 30A</b> onto <b>I-84 E</b>';
    assert.equal(formatDirectionInstructionText(html), 'Take Exit 30A onto I-84 E');
  });

  it('applies the same Exit format to any numbered exit, including secondary lines', () => {
    const html =
      'Keep <b>left</b> to take <b>exit 12 a</b><br/>Then take exit 7 B';
    const result = formatDirectionInstruction(html);
    assert.equal(result.primary, 'Keep left to take Exit 12A');
    assert.equal(result.secondary, 'Then take Exit 7B');
  });
});

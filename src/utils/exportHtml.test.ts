import { describe, it, expect } from 'vitest';
import { generateStandaloneHtml } from './exportHtml';

describe('generateStandaloneHtml', () => {
  it('cannot be broken out of by shader or uniform content', () => {
    const html = generateStandaloneHtml(
      'void main(){} // </script><script>alert(1)</script> `${x}`',
      'void main(){}',
      [{ name: 'c', type: 'color', value: "');alert(1);('" } as never],
      [],
    );
    expect(html.match(/<\/script>/g)?.length).toBe(2);
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('\\u003c/script>');
  });
});

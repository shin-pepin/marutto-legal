/**
 * Tagged template literal for safe HTML generation.
 * All interpolated values are automatically HTML-escaped.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const ESCAPE_RE = /[&<>"']/g;

export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, (char) => ESCAPE_MAP[char]!);
}

/**
 * Tagged template literal that auto-escapes all interpolated values.
 * Use `safeHtml()` to mark pre-escaped HTML as safe.
 *
 * @example
 * const name = '<script>alert("xss")</script>';
 * const result = html`<p>${name}</p>`;
 * // => '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>'
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const value = values[i];
      if (value instanceof SafeHtml) {
        result += value.toString();
      } else if (Array.isArray(value)) {
        result += value
          .map((v) => (v instanceof SafeHtml ? v.toString() : escapeHtml(String(v ?? ""))))
          .join("");
      } else {
        result += escapeHtml(String(value ?? ""));
      }
    }
  }
  return result;
}

/**
 * Wrapper class to mark HTML strings as safe (pre-escaped).
 * Use with `safeHtml()` function.
 */
class SafeHtml {
  constructor(private html: string) {}
  toString(): string {
    return this.html;
  }
}

/**
 * Mark a string as safe HTML that should not be escaped.
 * Only use with trusted, pre-escaped content.
 */
export function safeHtml(str: string): SafeHtml {
  return new SafeHtml(str);
}

/**
 * Convert newlines to <br> tags in user-supplied text.
 * The text is first HTML-escaped via the html`` tag, then newlines are replaced.
 */
export function nlToBr(text: string): string {
  const escaped = html`${text}`;
  return escaped.replace(/\n/g, "<br>");
}

/**
 * Look up a label from an options array by value.
 * Falls back to the raw value if not found.
 */
export function getLabelFromOptions(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}

import {
  publicErrorMessageFromUnknown,
  safeUrlForError,
  sanitizeExternalServiceMessage,
  sanitizeUrlForLogs,
} from './safe-error';

describe('safe-error', () => {
  test('sanitizeUrlForLogs strips query string', () => {
    expect(sanitizeUrlForLogs('https://example.com/path?token=secret')).toBe('https://example.com/path');
  });

  test('safeUrlForError remains an alias for sanitizeUrlForLogs', () => {
    expect(safeUrlForError('https://a.com/x?q=1')).toBe(sanitizeUrlForLogs('https://a.com/x?q=1'));
  });

  test('sanitizeUrlForLogs strips URL fragment', () => {
    expect(sanitizeUrlForLogs('https://ex.com/app#token=leak')).toBe('https://ex.com/app');
  });

  test('sanitizeExternalServiceMessage redacts password-style fragments', () => {
    const msg = sanitizeExternalServiceMessage('upstream said password=supersecret');
    expect(msg).not.toContain('supersecret');
  });

  test('sanitizeExternalServiceMessage truncates and redacts JWT-like content', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const msg = sanitizeExternalServiceMessage(`Error: ${jwt}`);
    expect(msg).not.toContain('eyJ');
  });

  test('publicErrorMessageFromUnknown never forwards full stack text as primary payload', () => {
    const err = new Error('something failed');
    err.stack = 'Error: something failed\n    at secret.js:1:1';
    const pub = publicErrorMessageFromUnknown(err);
    expect(pub).toContain('something failed');
    expect(pub).not.toContain('secret.js');
  });
});

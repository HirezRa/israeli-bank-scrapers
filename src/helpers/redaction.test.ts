import { REDACTED, redactDeep, redactHeaders, redactSensitiveString, shouldRedactKey } from './redaction';

describe('redaction', () => {
  test('shouldRedactKey detects common secret keys', () => {
    expect(shouldRedactKey('password')).toBe(true);
    expect(shouldRedactKey('accessToken')).toBe(true);
    expect(shouldRedactKey('otpCode')).toBe(true);
    expect(shouldRedactKey('Authorization')).toBe(true);
    expect(shouldRedactKey('portfolioId')).toBe(false);
  });

  test('redactDeep redacts nested credentials', () => {
    const input = {
      user: 'alice',
      password: 'secret',
      nested: { refreshToken: 'tok', ok: 1 },
    };
    const out = redactDeep(input) as Record<string, unknown>;
    expect(out.password).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).refreshToken).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).ok).toBe(1);
    expect(out.user).toBe('alice');
  });

  test('redactSensitiveString removes password=/otp= style leaks', () => {
    expect(redactSensitiveString('failed: password=secret123 end')).toContain(`password=${REDACTED}`);
    expect(redactSensitiveString('otp: 123456')).toContain(`otp=${REDACTED}`);
  });

  test('redactSensitiveString removes JWT-like and Bearer tokens', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const s = redactSensitiveString(`prefix ${jwt} suffix`);
    expect(s).not.toContain('eyJ');
    expect(s).toContain(REDACTED);
    expect(redactSensitiveString('Bearer abc.def.ghi')).toContain(`Bearer ${REDACTED}`);
  });

  test('redactHeaders masks authorization', () => {
    const h = redactHeaders({ Authorization: 'Bearer x', 'Content-Type': 'application/json' });
    expect(h.Authorization).toBe(REDACTED);
    expect(h['Content-Type']).toBe('application/json');
  });
});

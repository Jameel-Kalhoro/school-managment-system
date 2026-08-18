import { comparePassword, generateTempPassword, hashPassword } from './password.util';

describe('password util', () => {
  describe('generateTempPassword', () => {
    it('returns the requested length', () => {
      expect(generateTempPassword().length).toBe(12);
      expect(generateTempPassword(16).length).toBe(16);
    });

    it('contains at least one special character', () => {
      for (let i = 0; i < 20; i++) {
        expect(/[@#$%&*]/.test(generateTempPassword())).toBe(true);
      }
    });

    it('avoids ambiguous characters (0,O,1,l,I)', () => {
      for (let i = 0; i < 20; i++) {
        expect(/[0O1lI]/.test(generateTempPassword())).toBe(false);
      }
    });

    it('produces different values each call', () => {
      const a = generateTempPassword();
      const b = generateTempPassword();
      expect(a).not.toBe(b);
    });
  });

  describe('hash/compare', () => {
    it('round-trips a correct password', async () => {
      const hash = await hashPassword('Secret123!');
      expect(await comparePassword('Secret123!', hash)).toBe(true);
    });

    it('rejects a wrong password', async () => {
      const hash = await hashPassword('Secret123!');
      expect(await comparePassword('wrong', hash)).toBe(false);
    });
  });
});

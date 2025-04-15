// replicate validate registration because i dont know what im doing and could not import
function validateRegistration(username, email, password) {
  // SOURCE: https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])/;

  if (!email.match(emailRegex)) {
      throw new Error('invalid email!');
  }

  // SOURCE: gpt
  // lowercase, alphanumeric, atleast 4 characters, and can contain - and _
  const usernameRegex = /^[a-z0-9_-]{4,}$/

  if (!username.match(usernameRegex)) {
      throw new Error('invalid username!');
  }

  // SOURCE ORIG: https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
  const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

  if (!password.match(passwordRegex)) {
      throw new Error('invalid password!');
  }
}

describe('validateRegistration', () => {
  // valid test cases
  test('should accept valid registration details', () => {
    expect(() => {
      validateRegistration('validuser', 'valid@example.com', 'Password1!');
    }).not.toThrow();
  });

  // email validation checks
  test('should reject invalid email formats', () => {
    const invalidEmails = [ 
      'invalid',
      'invalid@',
      '@example.com',
      'invalid@example',
      'invalid @example.com',
      'invalid@example..com'
    ];

    invalidEmails.forEach(email => {
      expect(() => {
        validateRegistration('validuser', email, 'Password1!');
      }).toThrow('invalid email!');
    });
  });

  test('should accept valid email formats', () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user-name@example.com',
      'user_name@example.com',
      'user123@example.co.uk'
    ];

    validEmails.forEach(email => {
      expect(() => {
        validateRegistration('validuser', email, 'Password1!');
      }).not.toThrow();
    });
  });

  // username validation tests
  test('should reject invalid username formats', () => {
    const invalidUsernames = [
      'abc',             // too short (less than 4 chars)
      'User',            // contains uppercase
      'user name',       // contains space
      'user!name',       // contains special char (other than - and _)
      'üserñame'         // contains non-alphanumeric chars
    ];

    invalidUsernames.forEach(username => {
      expect(() => {
        validateRegistration(username, 'valid@example.com', 'Password1!');
      }).toThrow('invalid username!');
    });
  });

  test('should accept valid username formats', () => {
    const validUsernames = [
      'user',
      'user123',
      'user-name',
      'user_name',
      'user-name_123'
    ];

    validUsernames.forEach(username => {
      expect(() => {
        validateRegistration(username, 'valid@example.com', 'Password1!');
      }).not.toThrow();
    });
  });

  // password validation tests
  test('should reject invalid password formats', () => {
    const invalidPasswords = [
      'password',            // no uppercase, number, or special char
      'Password',            // no number or special char
      'Password1',           // no special char
      'Password!',           // no number
      'Pass1!',              // too short (less than 8 chars)
      'password1!',          // no uppercase
      'PASSWORD1!'           // no lowercase
    ];

    invalidPasswords.forEach(password => {
      expect(() => {
        validateRegistration('validuser', 'valid@example.com', password);
      }).toThrow('invalid password!');
    });
  });

  test('should accept valid password formats', () => {
    const validPasswords = [
      'Password1!',
      'Str0ng#Password',
      'C0mplex!Pass',
      'V3ry$ecure',
      '1Secure!Password'
    ];

    validPasswords.forEach(password => {
      expect(() => {
        validateRegistration('validuser', 'valid@example.com', password);
      }).not.toThrow();
    });
  });

  // edge cases
  test('should handle edge cases properly', () => {
    // minimum valid
    expect(() => {
      validateRegistration('user', 'a@b.co', 'Pa55w0rd!');
    }).not.toThrow();

    // long values
    const longUsername = 'a'.repeat(30);
    const longEmail = 'a'.repeat(50) + '@example.com';
    const longPassword = 'Password1!' + 'a'.repeat(50);

    expect(() => {
      validateRegistration(longUsername, 'valid@example.com', 'Password1!');
    }).not.toThrow();

    expect(() => {
      validateRegistration('validuser', longEmail, 'Password1!');
    }).not.toThrow();

    expect(() => {
      validateRegistration('validuser', 'valid@example.com', longPassword);
    }).not.toThrow();
  });
});
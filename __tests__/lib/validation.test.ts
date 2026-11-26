import {
  PASSWORD_MIN_LENGTH,
  getPasswordValidationError,
  validateEmail,
  validateImageFile,
  validatePassword,
} from "@/lib/validation";

describe("lib/validation", () => {
  describe("validatePassword", () => {
    it("accepts a password meeting all requirements at exact minimum length", () => {
      const result = validatePassword("Abcd123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.rulesMet).toEqual({
        minLength: true,
        uppercase: true,
        lowercase: true,
        number: true,
        special: true,
      });
    });

    it("fails all rules for an empty string", () => {
      const result = validatePassword("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(Object.values(result.rulesMet).every((v) => v === false)).toBe(true);
    });

    it("detects each individual missing rule", () => {
      expect(validatePassword("Abc12!").rulesMet.minLength).toBe(false);
      expect(PASSWORD_MIN_LENGTH).toBe(8);

      const noUpper = validatePassword("abcdef1!");
      expect(noUpper.isValid).toBe(false);
      expect(noUpper.rulesMet.uppercase).toBe(false);
      expect(noUpper.rulesMet.lowercase).toBe(true);

      const noLower = validatePassword("ABCDEF1!");
      expect(noLower.isValid).toBe(false);
      expect(noLower.rulesMet.lowercase).toBe(false);

      const noNumber = validatePassword("Abcdefg!");
      expect(noNumber.isValid).toBe(false);
      expect(noNumber.rulesMet.number).toBe(false);

      const noSpecial = validatePassword("Abcdef12");
      expect(noSpecial.isValid).toBe(false);
      expect(noSpecial.rulesMet.special).toBe(false);
    });
  });

  describe("getPasswordValidationError", () => {
    it("returns null for a valid password", () => {
      expect(getPasswordValidationError("StrongP@ss1")).toBeNull();
    });

    it("returns a human-readable list of missing requirements", () => {
      const error = getPasswordValidationError("abc");
      expect(error).toContain("Password must include:");
      expect(error).toContain("At least 8 characters");
      expect(error).toContain("At least one uppercase letter (A-Z)");
      expect(error).toContain("At least one number (0-9)");
      expect(error).toContain("At least one special character");
    });
  });

  describe("validateEmail", () => {
    it("accepts valid emails including leading/trailing whitespace", () => {
      expect(validateEmail("user@example.com")).toBeNull();
      expect(validateEmail("  first.last+tag@sub.domain.co.uk  ")).toBeNull();
    });

    it("rejects empty or whitespace-only input", () => {
      expect(validateEmail("")).toBe("Email address is required.");
      expect(validateEmail("   ")).toBe("Email address is required.");
    });

    it("rejects malformed email addresses", () => {
      expect(validateEmail("not-an-email")).toMatch(/valid email address/i);
      expect(validateEmail("user@localhost")).toMatch(/valid email address/i);
      expect(validateEmail("@example.com")).toMatch(/valid email address/i);
      expect(validateEmail("user@.com")).toMatch(/valid email address/i);
      expect(validateEmail("user name@example.com")).toMatch(
        /valid email address/i,
      );
    });
  });

  describe("validateImageFile", () => {
    const options = {
      maxSizeBytes: 2 * 1024 * 1024,
      allowedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
    };

    it("returns null for an allowed MIME type within the size limit", () => {
      expect(
        validateImageFile({ type: "image/png", size: 2 * 1024 * 1024 }, options),
      ).toBeNull();
    });

    it("rejects disallowed MIME types using default and custom format labels", () => {
      expect(
        validateImageFile({ type: "image/gif", size: 1024 }, options),
      ).toBe("Invalid image format. Please select a JPG, PNG, or WEBP image.");

      expect(
        validateImageFile(
          { type: "application/pdf", size: 1024 },
          { ...options, formatLabel: "PNG only" },
        ),
      ).toBe("Invalid image format. Please select a PNG only image.");
    });

    it("rejects files larger than maxSizeBytes with rounded MB label", () => {
      expect(
        validateImageFile(
          { type: "image/jpeg", size: 2 * 1024 * 1024 + 1 },
          options,
        ),
      ).toBe("Image size must be under 2 MB.");

      expect(
        validateImageFile(
          { type: "image/webp", size: 2 * 1024 * 1024 },
          { ...options, maxSizeBytes: 1.5 * 1024 * 1024 },
        ),
      ).toBe("Image size must be under 1.5 MB.");
    });
  });
});

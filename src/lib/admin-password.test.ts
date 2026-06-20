import { describe, expect, it } from "vitest";
import {
  adminPasswordPlaceholders,
  minAdminPasswordLength,
  validateAdminPassword,
  validateAdminPasswordConfirmation,
} from "@/lib/admin-password";

describe("admin password", () => {
  it("未入力、空白だけ、5文字以下を拒否し、6文字は許可する", () => {
    expect(() => validateAdminPassword("")).toThrow("管理者用パスワードを入力してください");
    expect(() => validateAdminPassword("        ")).toThrow("管理者用パスワードを入力してください");
    expect(() => validateAdminPassword("abcde")).toThrow("6文字以上");
    expect(() => validateAdminPassword("abcdef")).not.toThrow();
    expect(minAdminPasswordLength).toBe(6);
  });

  it("確認用と一致しない場合は拒否する", () => {
    expect(() => validateAdminPasswordConfirmation("abcdef", "abcdef")).not.toThrow();
    expect(() => validateAdminPasswordConfirmation("abcdef", "abcdeg")).toThrow(
      "一致しません",
    );
  });

  it("パスワード入力欄のplaceholderを持ち、古い文字数条件を含まない", () => {
    const oldMinimumText = ["8", "文字"].join("");

    expect(adminPasswordPlaceholders.password).toBe("6文字以上で入力してください");
    expect(adminPasswordPlaceholders.passwordConfirm).toBe("もう一度入力してください");
    expect(adminPasswordPlaceholders.currentPassword).toBe("現在のパスワードを入力してください");
    expect(adminPasswordPlaceholders.newPassword).toBe("6文字以上で入力してください");
    expect(adminPasswordPlaceholders.newPasswordConfirm).toBe("もう一度入力してください");
    expect(Object.values(adminPasswordPlaceholders).join(" ")).not.toContain(oldMinimumText);
  });
});

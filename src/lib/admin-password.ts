export const minAdminPasswordLength = 6;

export const adminPasswordPlaceholders = {
  password: "6文字以上で入力してください",
  passwordConfirm: "もう一度入力してください",
  currentPassword: "現在のパスワードを入力してください",
  newPassword: "6文字以上で入力してください",
  newPasswordConfirm: "もう一度入力してください",
} as const;

export function validateAdminPassword(password: string): void {
  if (!password.trim()) {
    throw new Error("管理者用パスワードを入力してください");
  }

  if (password.length < minAdminPasswordLength) {
    throw new Error(`管理者用パスワードは${minAdminPasswordLength}文字以上で入力してください。`);
  }
}

export function validateAdminPasswordConfirmation(
  password: string,
  passwordConfirm: string,
): void {
  validateAdminPassword(password);

  if (password !== passwordConfirm) {
    throw new Error("管理者用パスワードと確認用の入力が一致しません");
  }
}

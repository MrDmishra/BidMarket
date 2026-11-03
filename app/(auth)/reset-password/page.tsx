import type { Metadata } from "next";
import { resetPassword } from "@/modules/accounts/auth-actions";
import { AuthForm } from "@/modules/accounts/auth-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <AuthForm
        action={resetPassword}
        submitLabel="Save password"
        fields={[
          {
            name: "password",
            label: "New password",
            type: "password",
            autoComplete: "new-password",
            hint: "At least 10 characters.",
          },
          {
            name: "confirmPassword",
            label: "Confirm password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
    </>
  );
}

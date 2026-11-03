import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "docs/**", "playwright-report/**"] },
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
    },
  },
  {
    // AGENTS.md section 6: provider SDKs stay behind adapters.
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/providers/**", "lib/supabase/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@sentry/*", "razorpay", "resend", "@supabase/*"],
              message: "Import provider SDKs only inside lib/providers or lib/supabase.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { SkeletonRows } from "@/components/ui/skeleton";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Enrolment = { factorId: string; qrCode?: string; secret?: string };

const LOAD_FAILED = "We could not start two-step login. Reload the page and try again.";

async function prepareFactor(): Promise<Enrolment> {
  const { mfa } = createBrowserSupabaseClient().auth;
  const { data, error } = await mfa.listFactors();
  if (error) throw error;

  const verified = data.totp.find((factor) => factor.status === "verified");
  if (verified) return { factorId: verified.id };

  // An abandoned setup blocks a new one, so it is cleared first.
  for (const factor of data.all.filter((item) => item.status === "unverified")) {
    await mfa.unenroll({ factorId: factor.id });
  }
  const enrolment = await mfa.enroll({ factorType: "totp", friendlyName: "Bid Market admin" });
  if (enrolment.error) throw enrolment.error;
  return {
    factorId: enrolment.data.id,
    qrCode: enrolment.data.totp.qr_code,
    secret: enrolment.data.totp.secret,
  };
}

export function AdminSecurityForm() {
  const router = useRouter();
  const [factor, setFactor] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    prepareFactor()
      .then(setFactor)
      .catch(() => setError(LOAD_FAILED));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factor) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setPending(true);
    setError("");
    const result = await createBrowserSupabaseClient().auth.mfa.challengeAndVerify({
      factorId: factor.factorId,
      code,
    });
    if (result.error) {
      setPending(false);
      setError("That code did not work. Enter the latest code and try again.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  if (!factor) {
    return error ? (
      <Banner tone="bad">{error}</Banner>
    ) : (
      <SkeletonRows rows={3} label="Preparing two-step login" />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {factor.qrCode ? (
        <>
          <p>Scan this code with an authenticator app, then enter the 6-digit code it shows.</p>
          <Image
            src={factor.qrCode}
            alt="Authenticator setup code"
            width={200}
            height={200}
            unoptimized
            className="self-center bg-white p-2"
          />
          <p className="text-sm text-muted">
            Can&apos;t scan it? Enter this key:{" "}
            <span className="font-mono wrap-anywhere">{factor.secret}</span>
          </p>
        </>
      ) : (
        <p>Enter the 6-digit code from your authenticator app.</p>
      )}
      <TextField
        id="totp-code"
        label="Authentication code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <Button type="submit" loading={pending}>
        Verify and continue
      </Button>
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { Input } from "@/components/input";
import { Button } from "@/components/button";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify(form),
      });

      await apiRequest("/auth/login", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      router.push("/onboarding");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div>
        <p className="text-sm font-medium text-blue-600">
          Get started
        </p>

        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Create your JobPilot account
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your account is the foundation for your personalized job search.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="firstName"
            label="First name"
            value={form.firstName}
            onChange={(e) =>
              updateField("firstName", e.target.value)
            }
            autoComplete="given-name"
            required
          />

          <Input
            id="lastName"
            label="Last name"
            value={form.lastName}
            onChange={(e) =>
              updateField("lastName", e.target.value)
            }
            autoComplete="family-name"
            required
          />
        </div>

        <Input
          id="email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={(e) =>
            updateField("email", e.target.value)
          }
          autoComplete="email"
          required
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) =>
            updateField("password", e.target.value)
          }
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
          required
        />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
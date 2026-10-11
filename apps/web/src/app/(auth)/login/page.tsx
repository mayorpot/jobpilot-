"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { Input } from "@/components/input";
import { Button } from "@/components/button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await apiRequest("/auth/login", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify({
          email,
          password,
        }),
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-blue-600">
        Welcome back
      </p>

      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        Sign in to JobPilot
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Continue managing your career profile and opportunities.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          autoComplete="current-password"
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
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
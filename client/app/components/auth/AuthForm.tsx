"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { LoginPayload, RegisterPayload } from "@/lib/type";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

const defaultState = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
};

const AuthForm = ({ mode }: AuthFormProps) => {
  const router = useRouter();
  const [form, setForm] = useState(defaultState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const payload: LoginPayload = {
          email: form.email,
          password: form.password,
        };
        const response = await api.login(payload);
        setMessage(response.message ?? "Logged in successfully");
      } else {
        const payload: RegisterPayload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
        };
        const response = await api.register(payload);
        setMessage(response.message ?? "Account created successfully");
      }
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err) {
      const fallback =
        mode === "login"
          ? "Unable to sign in. Check your credentials."
          : "Unable to create an account right now.";
      setMessage(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to continue exploring Streamly."
            : "Register to start building personalized recommendations."}
        </p>
      </header>

      {mode === "register" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              name="first_name"
              autoComplete="given-name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              name="last_name"
              autoComplete="family-name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      <Button>
        {loading
          ? "Please wait..."
          : mode === "login"
          ? "Sign in"
          : "Create Account"}
      </Button>

      {message && (
        <p className="rounded-md border border-muted-foreground/30 bg-muted/20 p-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </form>
  );
};

export default AuthForm;

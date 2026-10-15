
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to log in. Please try again.");
        return;
      }

      router.replace("/forms");
      router.refresh();
    } catch {
      setError(
        "Could not connect to the server. Make sure your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          FormBuilder<span>.</span>
        </Link>

        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Log in to continue building your forms.</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="password">Password</label>
            </div>

            <div className="auth-password">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="auth-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link href="/register">Create one</Link>
        </p>
      </section>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: #f8fafc;
          color: #172033;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          background: white;
          border: 1px solid #e7eaf0;
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06);
        }

        .auth-brand {
          display: inline-block;
          margin-bottom: 36px;
          color: #172033;
          font-size: 25px;
          font-weight: 800;
          text-decoration: none;
          letter-spacing: -1px;
        }

        .auth-brand span {
          color: #635bff;
        }

        .auth-heading {
          margin-bottom: 28px;
        }

        .auth-heading h1 {
          margin: 0 0 10px;
          font-size: 30px;
          font-weight: 750;
          letter-spacing: -1px;
        }

        .auth-heading p {
          margin: 0;
          color: #667085;
          font-size: 14px;
          line-height: 1.6;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 21px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .auth-field label {
          font-size: 14px;
          font-weight: 600;
        }

        .auth-field input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid #d9dee8;
          border-radius: 9px;
          outline: none;
          background: white;
          color: #172033;
          font: inherit;
          font-size: 14px;
        }

        .auth-field input:focus {
          border-color: #635bff;
          box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
        }

        .auth-password {
          display: flex;
          align-items: center;
          border: 1px solid #d9dee8;
          border-radius: 9px;
        }

        .auth-password:focus-within {
          border-color: #635bff;
          box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
        }

        .auth-password input {
          border: none;
          box-shadow: none;
        }

        .auth-password input:focus {
          box-shadow: none;
        }

        .auth-toggle {
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: #635bff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .auth-submit {
          width: 100%;
          padding: 14px;
          margin-top: 4px;
          border: none;
          border-radius: 9px;
          background: #635bff;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .auth-submit:hover {
          background: #5148e5;
        }

        .auth-submit:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .auth-error {
          margin-bottom: 20px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          line-height: 1.5;
        }

        .auth-switch {
          margin: 26px 0 0;
          text-align: center;
          color: #667085;
          font-size: 14px;
        }

        .auth-switch a {
          color: #635bff;
          font-weight: 700;
          text-decoration: none;
        }

        .auth-switch a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 22px;
          }

          .auth-heading h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}

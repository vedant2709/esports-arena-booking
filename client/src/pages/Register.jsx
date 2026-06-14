import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form); // creates the account, then auto-logs in
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm outline-none transition focus:border-neon";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 mb-8 text-sm text-zinc-400">Sign up to start booking.</p>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Name</label>
          <input name="name" required value={form.name} onChange={onChange} className={inputCls} placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Email</label>
          <input name="email" type="email" required value={form.email} onChange={onChange} className={inputCls} placeholder="you@example.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Phone</label>
          <input name="phone" required value={form.phone} onChange={onChange} className={inputCls} placeholder="9876543210" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Password</label>
          <input name="password" type="password" required minLength={6} value={form.password} onChange={onChange} className={inputCls} placeholder="At least 6 characters" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-neon py-2.5 font-semibold text-zinc-950 transition hover:opacity-90 disabled:opacity-50">
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-neon hover:underline">Log in</Link>
      </p>
    </div>
  );
}

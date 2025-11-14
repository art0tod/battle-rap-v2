"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, error, clearError, actionInFlight, user } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (error) {
      clearError();
    }
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login(form);
      router.push("/");
    } catch {
      // handled in context
    }
  };

  if (user) {
    return (
      <div>
        <p>Вы уже авторизованы как {user.display_name}.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Вход</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Пароль
          <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
        </label>
        <button type="submit" disabled={actionInFlight}>
          Войти
        </button>
      </form>
      {error ? <p>Ошибка: {error}</p> : null}
    </div>
  );
}

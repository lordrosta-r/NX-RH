import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowRight, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";
import type { AxiosError } from "axios";
import { loginSchema, type LoginFormValues } from "../schemas";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();

  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alertError, setAlertError] = useState<{
    type: "error" | "warning";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true });
  }, [isAuthenticated, navigate, redirect]);

  async function onSubmit(data: LoginFormValues) {
    setAlertError(null);
    try {
      await login(data.email, data.password, remember);
      navigate(redirect, { replace: true });
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 401)
        setAlertError({ type: "error", message: t("auth.loginError") });
      else if (status === 429)
        setAlertError({ type: "warning", message: t("auth.tooManyAttempts") });
      else if (status === 403)
        setAlertError({ type: "error", message: t("auth.accountDisabled") });
      else setAlertError({ type: "error", message: t("auth.genericError") });
    }
  }

  return (
    <div className="auth-card">
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow">{t("auth.eyebrowSpace")}</p>
        <h1 className="h1" style={{ marginTop: 8 }}>
          {t("auth.login")}
        </h1>
        <p className="body" style={{ marginTop: 8 }}>
          {t("auth.subtitle")}
        </p>
      </div>

      {alertError && (
        <div
          className={`auth-alert ${alertError.type}`}
          role="alert"
          style={{ marginBottom: 20 }}
        >
          {alertError.message}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Email */}
        <div className="field">
          <label htmlFor="email">{t("auth.email")}</label>
          <input
            id="email"
            type="email"
            autoFocus
            autoComplete="username"
            data-testid="login-email"
            placeholder="prenom.nom@nanoxplore.com"
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={isSubmitting}
            className={`input${errors.email ? " is-invalid" : ""}`}
          />
          {errors.email && (
            <span id="email-error" className="field-error">
              {errors.email.message}
            </span>
          )}
        </div>

        {/* Mot de passe */}
        <div className="field">
          <label htmlFor="password">{t("auth.password")}</label>
          <div className="input-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              data-testid="login-password"
              placeholder={t("auth.password")}
              {...register("password")}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={isSubmitting}
              className={`input has-icon${errors.password ? " is-invalid" : ""}`}
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
            >
              {showPassword ? (
                <EyeOff className="ico" style={{ width: 18, height: 18 }} />
              ) : (
                <Eye className="ico" style={{ width: 18, height: 18 }} />
              )}
            </button>
          </div>
          {errors.password && (
            <span id="password-error" className="field-error">
              {errors.password.message}
            </span>
          )}
        </div>

        {/* Se souvenir de moi */}
        <label className="checkbox" htmlFor="remember">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="box">
            <Check />
          </span>
          <span>{t("auth.remember")}</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          data-testid="login-submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg btn-block"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="ico animate-spin"
                style={{ width: 18, height: 18 }}
                aria-hidden
              />
              {t("auth.loginLoading")}
            </>
          ) : (
            <>
              {t("auth.loginButton")}
              <ArrowRight className="ico" aria-hidden />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

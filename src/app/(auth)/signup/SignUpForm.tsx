"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthForm } from "@/hooks/useAuthForm";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function SignUpForm() {
  const {
    formData,
    loading,
    error,
    showPassword,
    showConfirmPassword,
    handleChange,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    handleSubmit,
  } = useAuthForm({ isSignUp: true });
  const { t } = useI18n();

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-5">
        {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="h-12 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              className="h-12 rounded-none pr-11"
            />
            <button
              type="button"
              className="absolute right-0 top-0 inline-flex h-full cursor-pointer items-center justify-center px-3 text-zinc-500 hover:text-zinc-950"
              onClick={togglePasswordVisibility}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showPassword ? t("auth.hidePassword") : t("auth.showPassword")}</span>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="h-12 rounded-none pr-11"
            />
            <button
              type="button"
              className="absolute right-0 top-0 inline-flex h-full cursor-pointer items-center justify-center px-3 text-zinc-500 hover:text-zinc-950"
              onClick={toggleConfirmPasswordVisibility}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">
                {showConfirmPassword ? t("auth.hideConfirmPassword") : t("auth.showConfirmPassword")}
              </span>
            </button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button type="submit" className="h-12 w-full cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800" disabled={loading}>
          {loading ? t("auth.signUpLoading") : t("auth.signUp")}
        </Button>
        <div className="text-center text-sm text-zinc-600">
          {t("auth.haveAccount")}{" "}
          <Link href="/signin" className="font-semibold text-zinc-950 underline underline-offset-4">
            {t("auth.signIn")}
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuthForm } from "@/hooks/useAuthForm";

export function SignInForm({ message }: { message: string | null }) {
  const {
    formData,
    loading,
    error,
    showPassword,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
  } = useAuthForm();

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-5">
        {error && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            {message}
          </div>
        )}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mật khẩu</Label>
            <Link
              href="/reset-password"
              className="text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950"
            >
              Quên mật khẩu?
            </Link>
          </div>
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
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              </span>
            </button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          className="h-12 w-full cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800"
          disabled={loading}
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
        <div className="text-center text-sm text-zinc-600">
          Chưa có tài khoản?{" "}
          <Link
            href="/signup"
            className="font-semibold text-zinc-950 underline underline-offset-4"
          >
            Đăng ký
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}

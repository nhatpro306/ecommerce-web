"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";

interface AuthFormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface UseAuthFormProps {
  isSignUp?: boolean;
}

interface UseAuthFormReturn {
  formData: AuthFormState;
  loading: boolean;
  error: string | null;
  showPassword: boolean;
  showConfirmPassword: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  togglePasswordVisibility: () => void;
  toggleConfirmPasswordVisibility: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useAuthForm({ isSignUp = false }: UseAuthFormProps = {}): UseAuthFormReturn {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<AuthFormState>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword((prev) => !prev);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }

    if (isSignUp) {
      if (formData.password !== formData.confirmPassword) {
        setError(t("auth.passwordMismatch"));
        return;
      }
      if (formData.password.length < 6) {
        setError(t("auth.passwordMinLength"));
        return;
      }
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await signUp(formData.email, formData.password);
      } else {
        await signIn(formData.email, formData.password);
      }
      router.push("/");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : isSignUp ? t("auth.signUpError") : t("auth.signInError");
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    showPassword,
    showConfirmPassword,
    handleChange,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    handleSubmit,
  };
}

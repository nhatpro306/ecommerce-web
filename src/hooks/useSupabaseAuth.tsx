import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { profileService } from "@/services/profile/profileService";
import { authService } from "@/services/auth/authService";

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserProfile = async (currentUser: User) => {
    try {
      let userEmail = currentUser.email || "";

      if (!userEmail) {
        try {
          const authUserEmail = await authService.getCurrentUserEmail();
          if (authUserEmail) {
            userEmail = authUserEmail;
          }
        } catch (emailError) {
          console.error("Không thể lấy email người dùng:", emailError);
        }
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("profile_id, email")
        .eq("profile_id", currentUser.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Không thể kiểm tra hồ sơ người dùng:", fetchError);
        return;
      }

      if (existingProfile) {
        if (!existingProfile.email && userEmail) {
          await profileService.updateProfile(currentUser.id, {
            email: userEmail,
          });
        }

        return;
      }

      const { error: createError } = await supabase.from("profiles").insert({
        profile_id: currentUser.id,
        username: "",
        avatar_url: "",
        email: userEmail,
        created_at: new Date().toISOString(),
      });

      if (createError) {
        if (createError.code === "23505") {
          return;
        }

        console.error("Không thể tạo hồ sơ người dùng:", createError);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý hồ sơ người dùng:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await ensureUserProfile(session.user);
        }
      } catch (error) {
        console.error("Không thể lấy phiên đăng nhập:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await ensureUserProfile(session.user);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Đăng nhập thành công.");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      toast.error("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        await ensureUserProfile(data.user);
      }

      toast.success(
        "Đăng ký thành công. Vui lòng kiểm tra email nếu cần xác nhận tài khoản."
      );
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      toast.error("Đăng ký thất bại. Vui lòng thử lại.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        // Fallback: clear local session even if global sign-out endpoint fails.
        const { error: localError } = await supabase.auth.signOut({ scope: "local" });
        if (localError) {
          throw localError;
        }
      }

      setUser(null);
      setSession(null);

      toast.success("Đăng xuất thành công.");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      toast.error("Đăng xuất thất bại. Vui lòng thử lại.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}

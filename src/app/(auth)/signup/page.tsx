import Image from "next/image";
import SignUpForm from "./SignUpForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function SignUp() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden border border-zinc-800 bg-white shadow-2xl md:grid-cols-[1fr_0.9fr]">
        <div className="hidden bg-zinc-950 p-10 text-white md:flex md:flex-col md:justify-between">
          <Image
            src="/brand/resey-logo.jpg"
            alt="RESEY logo"
            width={130}
            height={100}
            className="h-20 w-auto object-contain invert"
            priority
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">
              Join RESEY
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none">
              Create your fit account.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-300">
              Tạo tài khoản để lưu giỏ hàng, theo dõi đơn hàng và nhận thông tin
              drop mới từ RESEY.
            </p>
          </div>
        </div>

        <Card className="rounded-none border-0 shadow-none">
          <CardHeader className="space-y-3">
            <div className="md:hidden">
              <Image
                src="/brand/resey-logo.jpg"
                alt="RESEY logo"
                width={110}
                height={80}
                className="h-16 w-auto object-contain"
                priority
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              RESEY Account
            </p>
            <CardTitle className="text-3xl font-black uppercase">
              Đăng ký
            </CardTitle>
            <CardDescription>
              Tạo tài khoản mới bằng email và mật khẩu.
            </CardDescription>
          </CardHeader>
          <SignUpForm />
        </Card>
      </div>
    </div>
  );
}

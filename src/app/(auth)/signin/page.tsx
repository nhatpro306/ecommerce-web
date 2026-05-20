import Image from "next/image";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "./SignInForm";

type SignInProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SignIn({ searchParams }: SignInProps) {
  const params = await searchParams;
  const message = params.message ? String(params.message) : null;

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
              Member access
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none">
              Welcome back.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-300">
              Đăng nhập để quản lý giỏ hàng, đơn hàng và trải nghiệm mua sắm
              RESEY cá nhân hóa hơn.
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
              Đăng nhập
            </CardTitle>
            <CardDescription>
              Nhập email và mật khẩu để tiếp tục mua sắm.
            </CardDescription>
          </CardHeader>
          <SignInForm message={message} />
        </Card>
      </div>
    </div>
  );
}

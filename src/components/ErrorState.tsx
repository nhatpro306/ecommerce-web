"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, WifiOff } from "lucide-react";
import Link from "next/link";

interface ErrorStateProps {
  title?: string;
  description?: string;
  showRetry?: boolean;
  showHomeButton?: boolean;
  onRetry?: () => void;
  error?: Error | null;
  type?: "network" | "not-found" | "permission" | "general";
}

export function ErrorState({
  title,
  description,
  showRetry = true,
  showHomeButton = true,
  onRetry,
  error,
  type = "general",
}: ErrorStateProps) {
  const getErrorConfig = () => {
    switch (type) {
      case "network":
        return {
          icon: <WifiOff className="text-destructive h-8 w-8" />,
          title: title || "Không thể kết nối",
          description:
            description ||
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.",
        };
      case "not-found":
        return {
          icon: <AlertCircle className="text-muted-foreground h-8 w-8" />,
          title: title || "Không có dữ liệu",
          description: description || "Không tìm thấy dữ liệu phù hợp.",
        };
      case "permission":
        return {
          icon: <AlertCircle className="text-destructive h-8 w-8" />,
          title: title || "Không có quyền truy cập",
          description: description || "Bạn không có quyền xem nội dung này.",
        };
      default:
        return {
          icon: <AlertCircle className="text-destructive h-8 w-8" />,
          title: title || "Đã xảy ra lỗi",
          description:
            description || "Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.",
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="flex min-h-[300px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {config.icon}
          </div>
          <CardTitle className="text-xl font-bold">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
          {error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-medium">
                Chi tiết lỗi
              </summary>
              <pre className="text-muted-foreground bg-muted mt-2 overflow-auto rounded p-2 text-xs">
                {error.message}
              </pre>
            </details>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {showRetry && onRetry && (
            <Button onClick={onRetry} className="w-full cursor-pointer">
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          )}
          {showHomeButton && (
            <Button
              render={<Link href="/" />}
              nativeButton={false}
              variant="outline"
              className="w-full cursor-pointer"
            >
              <Home className="mr-2 h-4 w-4" />
              Về trang chủ
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

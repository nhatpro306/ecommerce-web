"use client";

import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { OrderType } from "@/types";
import { useOrders } from '@/hooks/queries'
import { getClientUser } from "@/lib/supabase/clientUtils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

// Column helper for strongly typed columns
const columnHelper = createColumnHelper<OrderType>();

const orderStatusLabels: Record<string, string> = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

// Column definitions
const columns = [
  columnHelper.accessor("id", {
    header: "Mã đơn",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("created_at", {
    header: "Ngày đặt",
    cell: (info) => {
      const date = info.getValue();
      return date ? format(new Date(date), "dd/MM/yyyy") : "Chưa có";
    },
    sortingFn: "datetime",
  }),
  columnHelper.accessor("total", {
    header: "Tổng tiền",
    cell: (info) => formatCurrency(info.getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Trạng thái",
    cell: (info) => {
      const status = info.getValue();
      return (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            status === "delivered" || status === "shipped"
              ? "bg-green-100 text-green-800"
              : status === "processing"
                ? "bg-blue-100 text-blue-800"
                : status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
          }`}
        >
          {orderStatusLabels[status] || status}
        </span>
      );
    },
  }),
];

export function OrdersTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current user
  useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await getClientUser();
      if (user) {
        setUserId(user.id);
      }
      return user;
    },
  });

  // Fetch orders once we have the user ID
  const {
    data: orders = [],
    isLoading,
    error,
  } = useOrders(userId || "", {
    enabled: !!userId,
    queryKey: ["orders", userId || ""], // Provide a queryKey
  });

  // Configure the table
  const table = useReactTable({
    data: orders,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  // Loading state
  if (isLoading) {
    return <div className="py-4 text-center">Đang tải đơn hàng...</div>;
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 text-center text-red-500">
        Không thể tải đơn hàng: {error.message}
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 py-8 text-center">
        <h3 className="text-lg font-medium text-gray-600">Chưa có đơn hàng</h3>
        <p className="mt-2 text-gray-500">
          Khi bạn đặt hàng, đơn hàng sẽ hiển thị tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center space-x-1">
                    <span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </span>
                    <span>
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 text-sm whitespace-nowrap text-gray-500"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div className="flex items-center justify-between bg-gray-50 px-6 py-3">
        <div className="flex flex-1 justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Trước
          </Button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Trang{" "}
              <span className="font-medium">
                {table.getState().pagination.pageIndex + 1}
              </span>{" "}
              / <span className="font-medium">{table.getPageCount()}</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sau
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

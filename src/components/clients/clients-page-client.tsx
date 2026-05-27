"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientStatusBadge } from "./client-status-badge";
import { Button } from "@/components/auth/auth-ui";
import { getCountryName } from "@/lib/constants/countries";
import { formatDate, formatMoney } from "@/lib/utils/format";
import type { ClientListItem } from "@/lib/services/client.service";

type ClientsPageClientProps = {
  initialItems: ClientListItem[];
  initialMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function ClientsPageClient({
  initialItems,
  initialMeta,
}: ClientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [meta, setMeta] = useState(initialMeta);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [needClientHint, setNeedClientHint] = useState(false);

  // 从创建账单跳转而来：提示先建客户并打开新建对话框
  useEffect(() => {
    if (searchParams.get("hint") !== "need-client-for-invoice") return;

    setNeedClientHint(true);
    if (searchParams.get("openCreate") === "1") {
      setDialogOpen(true);
    }
    router.replace("/clients");
  }, [searchParams, router]);

  const fetchClients = useCallback(
    async (page: number, searchTerm: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(meta.limit),
        });
        if (searchTerm) params.set("search", searchTerm);

        const res = await fetch(`/api/clients?${params}`);
        const json = await res.json();
        if (json.success) {
          setItems(json.data);
          if (json.meta) setMeta(json.meta as typeof meta);
        }
      } finally {
        setLoading(false);
      }
    },
    [meta.limit]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchClients(1, search.trim());
  }

  function handleCreated() {
    setNeedClientHint(false);
    router.refresh();
    fetchClients(1, search.trim());
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-600">
            管理客户信息，共 {meta.total} 个客户
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ 新建客户</Button>
      </div>

      {needClientHint ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-medium">创建账单前需要先添加客户</p>
          <p className="mt-1 text-amber-800/90">
            请填写下方「新建客户」表单完成客户信息。保存成功后，即可前往
            <Link href="/invoices/new" className="mx-1 font-medium text-primary hover:underline">
              创建 Invoice
            </Link>
            或
            <Link href="/invoices/ai" className="mx-1 font-medium text-primary hover:underline">
              AI 生成账单
            </Link>
            。
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <input
          type="search"
          placeholder="搜索公司、联系人或邮箱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" variant="outline" disabled={loading}>
          搜索
        </Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Unpaid</th>
                <th className="px-4 py-3 font-medium text-center">Invoices</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    {loading ? "加载中..." : "暂无客户，点击「新建客户」开始添加"}
                  </td>
                </tr>
              ) : (
                items.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {client.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{client.contactName}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </td>
                    <td className="px-4 py-3">{getCountryName(client.country)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(client.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700">
                      {client.unpaidAmount > 0
                        ? formatMoney(client.unpaidAmount)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{client.invoiceCount}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(client.lastCollaborationAt ?? client.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ClientStatusBadge status={client.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            第 {meta.page} / {meta.totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1 || loading}
              onClick={() => fetchClients(meta.page - 1, search.trim())}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => fetchClients(meta.page + 1, search.trim())}
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}

      <ClientFormDialog
        open={dialogOpen}
        mode="create"
        onClose={() => setDialogOpen(false)}
        onSuccess={handleCreated}
      />
    </>
  );
}

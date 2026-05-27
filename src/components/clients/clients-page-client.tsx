"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClientFormDialog,
  type ClientFormValues,
} from "./client-form-dialog";
import { ClientStatusBadge } from "./client-status-badge";
import { Button } from "@/components/auth/auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";
import {
  TableActionButton,
  TableRowActions,
} from "@/components/ui/table-row-actions";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<{
    id: string;
    values: ClientFormValues;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needClientHint, setNeedClientHint] = useState(false);

  // 从创建账单跳转而来：提示先建客户并打开新建对话框
  useEffect(() => {
    if (searchParams.get("hint") !== "need-client-for-invoice") return;

    setNeedClientHint(true);
    if (searchParams.get("openCreate") === "1") {
      setCreateDialogOpen(true);
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

  function handleListChanged() {
    setNeedClientHint(false);
    router.refresh();
    fetchClients(meta.page, search.trim());
  }

  async function openEditDialog(clientId: string) {
    setActionError(null);
    setActionLoadingId(clientId);

    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setActionError(json.error ?? "加载客户信息失败");
        return;
      }

      const c = json.data as {
        companyName: string;
        contactName: string;
        email: string;
        country: string;
        address: string | null;
        vatNumber: string | null;
        notes: string | null;
      };

      setEditingClient({
        id: clientId,
        values: {
          companyName: c.companyName,
          contactName: c.contactName,
          email: c.email,
          country: c.country,
          address: c.address ?? "",
          vatNumber: c.vatNumber ?? "",
          notes: c.notes ?? "",
        },
      });
    } catch {
      setActionError("网络错误，请稍后重试");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteClient(client: ClientListItem) {
    if (
      !confirm(
        `Delete client "${client.companyName}"? This cannot be undone. Clients with invoices cannot be deleted.`
      )
    ) {
      return;
    }

    setActionError(null);
    setActionLoadingId(client.id);

    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setActionError(json.error ?? "删除失败");
        return;
      }

      handleListChanged();
    } catch {
      setActionError("网络错误，请稍后重试");
    } finally {
      setActionLoadingId(null);
    }
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
        <Button onClick={() => setCreateDialogOpen(true)}>+ 新建客户</Button>
      </div>

      {actionError ? (
        <div className="mt-4">
          <FormSubmitError message={actionError} />
        </div>
      ) : null}

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
          className="app-input h-10 flex-1"
        />
        <Button type="submit" variant="outline" loading={loading} loadingText="Searching…">
          Search
        </Button>
      </form>

      <div className="app-card relative mt-6 overflow-hidden">
        {loading ? <TableLoadingOverlay label="Loading clients…" /> : null}
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
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
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
                    <td className="px-4 py-3 text-right">
                      <TableRowActions>
                        <TableActionButton
                          variant="edit"
                          label="Edit"
                          disabled={actionLoadingId === client.id}
                          onClick={() => openEditDialog(client.id)}
                        />
                        <TableActionButton
                          variant="delete"
                          label="Delete"
                          disabled={actionLoadingId === client.id}
                          onClick={() => handleDeleteClient(client)}
                        />
                      </TableRowActions>
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
        open={createDialogOpen}
        mode="create"
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          setCreateDialogOpen(false);
          handleListChanged();
        }}
      />

      <ClientFormDialog
        open={!!editingClient}
        mode="edit"
        clientId={editingClient?.id}
        initialValues={editingClient?.values}
        onClose={() => setEditingClient(null)}
        onSuccess={() => {
          setEditingClient(null);
          handleListChanged();
        }}
      />
    </>
  );
}

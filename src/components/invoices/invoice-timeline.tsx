import { INVOICE_STATUS_CONFIG } from "@/lib/constants/invoice-status";
import { formatDate } from "@/lib/utils/format";
import type { InvoiceActivityType } from "@prisma/client";

const ACTIVITY_LABELS: Record<InvoiceActivityType, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  OVERDUE: "Overdue",
  REMINDER_SENT: "Reminder Sent",
  CANCELLED: "Cancelled",
  DUPLICATED: "Duplicated",
  PDF_GENERATED: "PDF Generated",
  NOTE_ADDED: "Note Added",
};

type Activity = {
  id: string;
  type: InvoiceActivityType;
  message: string | null;
  createdAt: Date | string;
};

export function InvoiceTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-4">
      {activities.map((activity) => (
        <li key={activity.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm font-medium text-slate-900">
            {ACTIVITY_LABELS[activity.type] ?? activity.type}
          </p>
          {activity.message ? (
            <p className="text-sm text-slate-600">{activity.message}</p>
          ) : null}
          <p className="text-xs text-slate-400">{formatDate(activity.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

export { INVOICE_STATUS_CONFIG };

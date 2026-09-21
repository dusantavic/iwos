// Numeric enums returned by the AdminClients API. Keep these in sync with
// Backend/Common/Contracts/Enums (ClientStatus, ClientPlan, ClientBilling).

export const ClientStatus = {
  0: "Active",
  1: "Trial",
  2: "Cancelled",
  3: "Suspended",
  4: "Pending",
  5: "Overdue",
};

export const ClientPlan = {
  0: "Free",
  1: "Basic",
  2: "Pro",
};

export const ClientBilling = {
  0: "Free",
  1: "Paid",
  2: "OverDue",
  3: "PastDue",
};

export const STATUS_OPTIONS = Object.entries(ClientStatus).map(([value, label]) => ({
  value: Number(value),
  label,
}));

const STATUS_BADGE_CLASS = {
  Active: "bg-green-100 text-green-800",
  Trial: "bg-blue-100 text-blue-800",
  Cancelled: "bg-red-100 text-red-800",
  Suspended: "bg-gray-200 text-gray-700",
  Pending: "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
};

const BILLING_BADGE_CLASS = {
  Free: "bg-blue-100 text-blue-800",
  Paid: "bg-green-100 text-green-800",
  OverDue: "bg-red-100 text-red-800",
  PastDue: "bg-red-100 text-red-800",
};

const PLAN_BADGE_CLASS = {
  Free: "bg-gray-100 text-gray-700",
  Basic: "bg-indigo-100 text-indigo-800",
  Pro: "bg-purple-100 text-purple-800",
};

export function statusLabel(status) {
  return ClientStatus[status] ?? "Unknown";
}

export function planLabel(plan) {
  return ClientPlan[plan] ?? "Unknown";
}

export function billingLabel(billing) {
  return ClientBilling[billing] ?? "Unknown";
}

export function StatusBadge({ status }) {
  const label = statusLabel(status);
  const cls = STATUS_BADGE_CLASS[label] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function PlanBadge({ plan }) {
  const label = planLabel(plan);
  const cls = PLAN_BADGE_CLASS[label] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function BillingBadge({ billing }) {
  const label = billingLabel(billing);
  const cls = BILLING_BADGE_CLASS[label] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

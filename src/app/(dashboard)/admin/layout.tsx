import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    // The admin console is English-only, but the app sets dir="rtl" on the
    // document for Arabic/Hebrew users. Inheriting that lays out English
    // sentences right-to-left: trailing periods jump to the front and "-3"
    // renders as "3-", which misreads a negative number. Pinning the console
    // to LTR keeps its own text correct without touching the app's direction.
    <div className="min-h-full" dir="ltr">
      <AdminNav />
      {children}
    </div>
  );
}

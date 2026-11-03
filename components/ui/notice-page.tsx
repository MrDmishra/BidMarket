import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";

type NoticePageProps = {
  title: string;
  body: string;
  action?: { href: string; label: string };
  children?: ReactNode;
};

export function NoticePage({ title, body, action, children }: NoticePageProps) {
  return (
    <main className="page-wrap py-12">
      <div className="flex max-w-xl flex-col items-start gap-4 rounded-panel border border-line bg-surface p-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted">{body}</p>
        {children}
        {action ? <ButtonLink href={action.href}>{action.label}</ButtonLink> : null}
      </div>
    </main>
  );
}

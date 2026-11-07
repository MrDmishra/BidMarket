import type { ReactNode } from "react";

export type ThreadMessage = {
  id: string;
  author: string;
  role?: string;
  body: string;
  sentAt: string;
};

export function MessageThread({
  messages,
  composer,
}: {
  messages: ThreadMessage[];
  composer?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {messages.map((message) => (
          <li key={message.id} className="rounded-panel border border-line bg-surface p-3">
            <p className="flex flex-wrap justify-between gap-2 text-sm text-muted">
              <span>
                <b className="font-semibold text-ink">{message.author}</b>
                {message.role ? `, ${message.role}` : null}
              </span>
              <span>{message.sentAt}</span>
            </p>
            <p className="mt-1 wrap-anywhere">{message.body}</p>
          </li>
        ))}
      </ol>
      {composer}
    </div>
  );
}

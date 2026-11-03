import { ContentPage } from "@/components/layout/content-page";
import { Banner } from "@/components/ui/banner";

export function LegalPage({ title, points }: { title: string; points: string[] }) {
  return (
    <ContentPage title={title}>
      <Banner tone="warn">
        Placeholder. This text is a plain summary of planned rules, not a legal document. A lawyer
        must draft this page before launch.
      </Banner>
      <ul className="flex max-w-2xl list-disc flex-col gap-2 pl-5">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </ContentPage>
  );
}

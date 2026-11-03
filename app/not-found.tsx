import { NoticePage } from "@/components/ui/notice-page";

export default function NotFound() {
  return (
    <NoticePage
      title="We can't find this page"
      body="The link may be out of date, or the page may have moved."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}

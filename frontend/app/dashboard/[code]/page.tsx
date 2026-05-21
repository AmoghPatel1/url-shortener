import { redirect } from "next/navigation";

export default function OldAnalyticsRedirect({ params }: { params: { code: string } }) {
  redirect(`/analytics/${params.code}`);
}

import { App } from "@/components/app";

export default function Page() {
  return (
    <div className="min-h-dvh bg-neutral-200/60 sm:py-6">
      {/* On desktop the app sits in a phone-width column so reviewers see the mobile layout. */}
      <div className="relative mx-auto min-h-dvh max-w-[430px] bg-background sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[2rem] sm:shadow-2xl sm:ring-1 sm:ring-black/10">
        <App />
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";

// The kiosk only runs in the browser (camera, URL flags, the kiosk key in localStorage).
const Booth = dynamic(() => import("@/components/Booth"), {
  ssr: false,
  loading: () => <main data-theme="dark" className="page-bg min-h-dvh flex-1" />,
});

export default function BoothPage() {
  return <Booth />;
}

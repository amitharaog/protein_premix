// Public pages wear the playful lavender theme; /admin keeps the dark research look.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-lav min-h-dvh">{children}</div>;
}

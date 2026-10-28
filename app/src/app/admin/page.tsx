import { surveyStats } from "@/lib/queries/survey";

// Minimal Phase 1 view so new responses are visible straight away. The full dashboard is SPEC §2.1 (Phase 3).
export default async function AdminHome() {
  const { total, latest } = await surveyStats();
  const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return (
    <main>
      <h1 className="font-display text-2xl font-bold">Survey responses</h1>
      <p className="tabular mt-1 text-4xl font-semibold">{total}</p>
      {total === 0 ? (
        <p className="mt-4 text-muted">No responses yet. Share the survey: <code>/survey</code></p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[14px] border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-accent-soft">
              <tr><th className="p-2">Updated (IST)</th><th className="p-2">Source</th><th className="p-2">Q5 price</th><th className="p-2">Q9 likely</th><th className="p-2">Q10</th></tr>
            </thead>
            <tbody>
              {latest.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="tabular p-2 whitespace-nowrap">{fmt.format(r.updatedAt)}</td>
                  <td className="p-2">{r.utm?.utm_source ?? r.source}</td>
                  <td className="p-2">{String(r.answers.Q5 ?? "—")}</td>
                  <td className="tabular p-2">{String(r.answers.Q9 ?? "—")}</td>
                  <td className="p-2">{String(r.answers.Q10 ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

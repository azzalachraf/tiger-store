import type { reportRange } from "./reporting";
export function ReportRangeControls({
  value,
  hidden = {},
}: {
  value: ReturnType<typeof reportRange>;
  hidden?: Record<string, string>;
}) {
  return (
    <form method="get" className="admin-panel mb-5">
      <div className="admin-toolbar mb-0">
        {Object.entries(hidden).map(([name, v]) => (
          <input key={name} type="hidden" name={name} value={v} />
        ))}
        <label>
          Period
          <select name="range" defaultValue={value.range}>
            {[
              ["today", "Today"],
              ["7", "Last 7 days"],
              ["30", "Last 30 days"],
              ["month", "This month"],
              ["all", "All time"],
              ["custom", "Custom dates"],
            ].map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Custom start
          <input name="start" type="date" defaultValue={value.start} />
        </label>
        <label>
          Custom end
          <input name="end" type="date" defaultValue={value.end} />
        </label>
        <button className="admin-btn admin-btn-primary">Apply period</button>
      </div>
      {value.invalid && (
        <p role="alert" className="admin-feedback" data-error="true">
          Choose valid start and end dates, with start before end and no future
          dates. Showing this month.
        </p>
      )}
    </form>
  );
}

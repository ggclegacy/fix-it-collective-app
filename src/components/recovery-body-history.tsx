import {
  compareBody,
  describeRegion,
  type BodySnapshot,
} from "@/lib/recovery/model";
export function BodyHistory({ history }: { history: BodySnapshot[] }) {
  return (
    <details className="bim-history">
      <summary>Body History · {history.length} saved reports</summary>
      <p className="rr-caption">
        Signed intake reports, not treatment outcomes. An unmarked area does not
        mean symptoms have resolved. Showing up to 12 recent reports.
      </p>
      {history.length ? (
        history.map((entry, index) => (
          <article key={entry.revision}>
            <h4>
              {new Date(entry.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "America/Chicago",
              })}{" "}
              · Report {entry.revision}
            </h4>
            {entry.noProblemAreas && <p>No pain / problem areas reported.</p>}
            {entry.body.length ? (
              entry.body.map((b) => (
                <p key={b.area}>
                  <strong>{b.area}</strong> · {describeRegion(b)}
                </p>
              ))
            ) : (
              <p>No areas marked.</p>
            )}
            {history[index + 1] && (
              <details>
                <summary>
                  Changes from report {history[index + 1].revision}
                </summary>
                {compareBody(entry.body, history[index + 1].body).map(
                  (line) => (
                    <p key={line}>{line}</p>
                  ),
                )}
                {compareBody(entry.body, history[index + 1].body).length ===
                  0 && <p>No region changes reported.</p>}
              </details>
            )}
          </article>
        ))
      ) : (
        <p>Your body history begins when you finish and save this intake.</p>
      )}
    </details>
  );
}

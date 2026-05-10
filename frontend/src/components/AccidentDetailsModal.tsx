import { useEffect, useState } from "react";
import { fetchAccidentDetails, type AccidentDetails } from "../services/accidentsService";
import "./AccidentDetailsModal.css";

interface Props {
  id: string;
  onClose: () => void;
}

export default function AccidentDetailsModal({ id, onClose }: Props) {
  const [details, setDetails] = useState<AccidentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetails(null);
    setError(null);
    fetchAccidentDetails(id)
      .then(setDetails)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>Accident details</span>
          <button className="modal__close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          {error && <div className="modal__error">{error}</div>}
          {!details && !error && <div className="modal__loading">Loading…</div>}
          {details && <DetailRows details={details} />}
        </div>
      </div>
    </div>
  );
}

function DetailRows({ details }: { details: AccidentDetails }) {
  const rows: [string, string][] = [
    ["Date", details.event_date],
    ["Time", details.event_time],
    ["Severity", details.severity],
    ["Description", details.description],
    ["Day / Night", details.day_night !== null ? (details.day_night ? 'Day' : 'Night') : '-'],
    ["Traffic light", details.traffic_light !== null ? (details.traffic_light ? "Yes" : "No") : "—"],
    ["Place", details.place || "—"],
    ["Crossroad", details.crossroad !== null ? (details.crossroad ? "Yes" : "No") : "—"],
    ["Urban", details.urban !== null ? (details.urban ? "Yes" : "No") : "—"],
    ["Road type", details.road_type || "—"],
  ];

  return (
    <table className="modal__table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="modal__label">{label}</td>
            <td className="modal__value">{value ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

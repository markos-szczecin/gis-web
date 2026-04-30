import { useEffect, useState } from "react";
import { fetchAccidentDetails } from "../services/accidentsService";

export default function AccidentDetailsModal({ id, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDetails(null);
    setError(null);
    fetchAccidentDetails(id)
      .then(setDetails)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span>Accident details</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}
          {!details && !error && <div style={styles.loading}>Loading…</div>}
          {details && <DetailRows details={details} />}
        </div>
      </div>
    </div>
  );
}

function DetailRows({ details }) {
  const rows = [
    ["Date", details.event_date],
    ["Time", details.event_time],
    ["Severity", details.severity],
    ["Description", details.description],
    ["Day / Night", details.day_night],
    ["Traffic light", details.traffic_light ? "Yes" : "No"],
    ["Place", details.place],
    ["Crossroad", details.crossroad ? "Yes" : "No"],
    ["Urban", details.urban ? "Yes" : "No"],
    ["Road type", details.road_type],
  ];

  return (
    <table style={styles.table}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={styles.label}>{label}</td>
            <td style={styles.value}>{value ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    background: "#1e1e2e",
    color: "#cdd6f4",
    borderRadius: 8,
    width: 420,
    maxWidth: "90vw",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "sans-serif",
    fontSize: 14,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #313244",
    fontWeight: 700,
    fontSize: 15,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#cdd6f4",
    cursor: "pointer",
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 1,
  },
  body: {
    padding: "12px 16px",
    overflowY: "auto",
  },
  loading: {
    opacity: 0.6,
    padding: "8px 0",
  },
  error: {
    color: "#f38ba8",
    padding: "8px 0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  label: {
    color: "#a6adc8",
    paddingRight: 16,
    paddingTop: 6,
    paddingBottom: 6,
    whiteSpace: "nowrap",
    verticalAlign: "top",
    width: "40%",
  },
  value: {
    color: "#cdd6f4",
    paddingTop: 6,
    paddingBottom: 6,
    verticalAlign: "top",
  },
};

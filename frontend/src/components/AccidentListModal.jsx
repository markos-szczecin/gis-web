export default function AccidentListModal({ items, onSelect, onClose }) {
  console.log("AccidentListModal rendered with items:", items);
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span>{items.length} accidents at this location</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <ul style={styles.list}>
          {items.map((item) => (
            <li key={item.id} style={styles.item} onClick={() => onSelect(item.id)}>
              <span style={styles.date}>{item.event_date ?? "Unknown date"}</span>
              <span style={styles.time}>{item.event_time ?? "Unknown time"}</span>
              {item.severity && <span style={severityStyle(item.severity)}>{item.severity}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function severityStyle(severity) {
  const colors = {
    fatal: "#f38ba8",
    serious: "#fab387",
    slight: "#a6e3a1",
  };
  const color = colors[severity?.toLowerCase()] ?? "#cdd6f4";
  return { ...styles.badge, color, borderColor: color };
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
    width: 360,
    maxWidth: "90vw",
    maxHeight: "70vh",
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
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    overflowY: "auto",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #313244",
    gap: 12,
  },
  date: {
    flex: 1,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    border: "1px solid",
    borderRadius: 4,
    padding: "2px 6px",
    whiteSpace: "nowrap",
  },
};

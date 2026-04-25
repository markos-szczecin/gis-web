import { useState } from "react";

const FILTER_GROUPS = [
  {
    id: "group-a",
    label: "Group A",
    filters: [
      { id: "a1", label: "Filter A1" },
      { id: "a2", label: "Filter A2" },
      { id: "a3", label: "Filter A3" },
    ],
  },
  {
    id: "group-b",
    label: "Group B",
    filters: [
      { id: "b1", label: "Filter B1" },
      { id: "b2", label: "Filter B2" },
    ],
  },
  {
    id: "group-c",
    label: "Group C",
    filters: [
      { id: "c1", label: "Filter C1" },
      { id: "c2", label: "Filter C2" },
      { id: "c3", label: "Filter C3" },
      { id: "c4", label: "Filter C4" },
    ],
  },
];

function FilterGroup({ group }) {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState({});

  const toggle = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={styles.group}>
      <button style={styles.groupHeader} onClick={() => setOpen((o) => !o)}>
        <span>{group.label}</span>
        <span style={styles.chevron}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div style={styles.filterList}>
          {group.filters.map((f) => (
            <label key={f.id} style={styles.filterItem}>
              <input
                type="checkbox"
                checked={!!checked[f.id]}
                onChange={() => toggle(f.id)}
                style={styles.checkbox}
              />
              {f.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ ...styles.wrapper, transform: collapsed ? "translateX(-240px)" : "translateX(0)" }}>
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          Filters
          <button style={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Hide sidebar">◀</button>
        </div>
        {FILTER_GROUPS.map((group) => (
          <FilterGroup key={group.id} group={group} />
        ))}
      </aside>
      <button style={styles.tabBtn} onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Show sidebar" : "Hide sidebar"}>
        {collapsed ? "▶" : "◀"}
      </button>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "absolute",
    zIndex: 9999,
    top: 0,
    left: 0,
    height: "100%",
    display: "flex",
    alignItems: "stretch",
    transition: "transform 0.3s ease",
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#1e1e2e",
    color: "#cdd6f4",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    fontFamily: "sans-serif",
    fontSize: 14,
  },
  header: {
    padding: "16px 16px 12px",
    fontWeight: 700,
    fontSize: 16,
    borderBottom: "1px solid #313244",
    letterSpacing: "0.03em",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collapseBtn: {
    background: "none",
    border: "none",
    color: "#cdd6f4",
    cursor: "pointer",
    fontSize: 12,
    opacity: 0.6,
    padding: "2px 4px",
    lineHeight: 1,
  },
  tabBtn: {
    alignSelf: "center",
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderLeft: "none",
    color: "#cdd6f4",
    cursor: "pointer",
    width: 20,
    height: 48,
    borderRadius: "0 6px 6px 0",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  group: {
    borderBottom: "1px solid #313244",
    // position: "absolute",
  },
  groupHeader: {
    width: "100%",
    background: "none",
    border: "none",
    color: "#cdd6f4",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    fontWeight: 600,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  chevron: {
    fontSize: 12,
    opacity: 0.7,
  },
  filterList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "4px 0 10px",
  },
  filterItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 16px",
    cursor: "pointer",
    borderRadius: 4,
  },
  checkbox: {
    accentColor: "#89b4fa",
    cursor: "pointer",
  },
};

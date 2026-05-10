import type { AccidentSummary } from "../layers/accidents";
import "./AccidentListModal.css";

interface Props {
  items: AccidentSummary[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function AccidentListModal({ items, onSelect, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>{items.length} accidents at this location</span>
          <button className="modal__close-btn" onClick={onClose}>✕</button>
        </div>
        <ul className="list-modal__list">
          {items.map((item) => (
            <li key={item.id} className="list-modal__item" onClick={() => onSelect(item.id)}>
              <span className="list-modal__date">{item.event_date ?? "Unknown date"}</span>
              <span>{item.event_time ?? "Unknown time"}</span>
              {item.severity && (
                <span className={`list-modal__badge list-modal__badge--${item.severity.toLowerCase() in SEVERITY_CLASSES ? item.severity.toLowerCase() : "default"}`}>
                  {item.severity}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const SEVERITY_CLASSES: Record<string, true> = {
  fatal: true,
  serious: true,
  slight: true,
};

import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import MapView from "./Map";
import Sidebar from "./Sidebar";

function App() {
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        minDate={minDate}
        maxDate={maxDate}
        onMinDateChange={setMinDate}
        onMaxDateChange={setMaxDate}
      />
      <div style={{ flex: 1 }}>
        <MapView minDate={minDate} maxDate={maxDate} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
import React from "react";
import ReactDOM from "react-dom/client";
import MapView from "./Map";
import Sidebar from "./Sidebar";

function App() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <MapView />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
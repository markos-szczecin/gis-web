import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Geo Dashboard</h1>
      <p>Frontend działa ✅</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
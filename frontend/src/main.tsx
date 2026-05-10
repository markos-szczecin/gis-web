import { useState } from "react";
import ReactDOM from "react-dom/client";
import MapView from "./Map";
import Sidebar from "./Sidebar";
import { defaultFilters } from "./config/config";
import { defaultRiskGridTime } from "./services/predictionsService";
import { defaultWeather, type WeatherParams } from "./config/weatherConfig";

function App() {
  const [activeLayer, setActiveLayer] = useState<"accidents" | "riskGrid">("accidents");
  const [minDate, setMinDate] = useState(defaultFilters.minDate);
  const [maxDate, setMaxDate] = useState(defaultFilters.maxDate);
  const [riskGridTime, setRiskGridTime] = useState(defaultRiskGridTime());
  const [weatherParams, setWeatherParams] = useState<WeatherParams>(defaultWeather);

  const handleSubmitAccidents = (min: string, max: string) => {
    setMinDate(min);
    setMaxDate(max);
  };

  const handleSubmitRiskGrid = (time: string, weather: WeatherParams) => {
    setRiskGridTime(time);
    setWeatherParams(weather);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        onSubmitAccidents={handleSubmitAccidents}
        onSubmitRiskGrid={handleSubmitRiskGrid}
      />
      <div style={{ flex: 1 }}>
        <MapView
          minDate={minDate}
          maxDate={maxDate}
          activeLayer={activeLayer}
          riskGridTime={riskGridTime}
          weatherParams={weatherParams}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

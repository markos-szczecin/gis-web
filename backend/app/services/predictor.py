"""
Production accident risk predictor for Szczecin grid cells.

API:
    predictor = AccidentRiskPredictor.load('artifact_dir/')
    result = predictor.predict(
        time='2026-02-15 08:00',
        cell_id=122,
        weather={'temperature_2m': 5.0, 'precipitation': 2.5, ...}
    )
    # → {'risk_probability': 0.0023, 'lift_over_baseline': 6.7, ...}

The model was trained on data through 2025. Predictions for times far beyond
the training period assume that historical cell-level statistics (cell_past_rate,
last accident time, etc.) remain representative — accuracy will degrade over
time as drift accumulates. Recommendation: refresh the feature store quarterly.
"""

from __future__ import annotations
import json
import pickle
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Union, Sequence

import numpy as np
import pandas as pd
import xgboost as xgb


# Constants matching v3 feature engineering
_SEASON_MAP = {12: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 1,
               6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3}
_BASELINE_RATE = 0.000345  # ~0.0345% from data


@dataclass
class FeatureStore:
    """Per-cell snapshot of features that don't depend on inference-time inputs.

    All arrays are indexed by *internal* cell index (0..N-1), with cell_ids[i]
    giving the original cell_id value.
    """
    # Identity & geometry
    cell_ids: np.ndarray              # (N,)
    centroid_x: np.ndarray            # (N,) meters in EPSG:2180
    centroid_y: np.ndarray            # (N,)
    cx_norm: np.ndarray               # (N,) normalized to [0, 1]
    cy_norm: np.ndarray

    # Conditional historical rates
    cell_past_rate: np.ndarray         # (N,)
    cell_hour_past_rate: np.ndarray    # (N, 24) - only window-start hours {0,6,12,18} populated
    cell_dow_past_rate: np.ndarray     # (N, 7)

    # Lag sums (snapshotted)
    accidents_lag_sum_4: np.ndarray
    accidents_lag_sum_28: np.ndarray
    accidents_lag_sum_120: np.ndarray
    spatial_lag_sum_4: np.ndarray
    spatial_lag_sum_28: np.ndarray
    spatial_lag_sum_120: np.ndarray

    # Recency (snapshotted)
    time_since_last_acc: np.ndarray    # in 6h windows
    snapshot_window_idx: int

    # Neighbor aggregates (precomputed)
    nb_cell_past_rate: np.ndarray
    nb_cell_hour_past_rate: np.ndarray  # (N, 24)
    nb_cell_dow_past_rate: np.ndarray   # (N, 7)

    # Constants
    recency_half_life: float = 28.0
    snapshot_time: Optional[pd.Timestamp] = None


class _FeatureStoreUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if name == 'FeatureStore':
            return FeatureStore
        return super().find_class(module, name)


class AccidentRiskPredictor:
    """Predicts accident probability in a 6h time window for Szczecin grid cells."""

    WEATHER_KEYS = (
        'temperature_2m', 'apparent_temperature', 'precipitation',
        'rain', 'snow_depth', 'wind_speed_10m', 'wind_gusts_10m',
        'cloud_cover', 'relative_humidity_2m', 'dew_point_2m',
        'surface_pressure', 'weather_code',
    )

    # Defaults used when weather_code is provided but other fields are omitted
    _WEATHER_DEFAULTS: dict = {
        'temperature_2m': 10.0,
        'apparent_temperature': 10.0,
        'precipitation': 0.0,
        'rain': 0.0,
        'snow_depth': 0.0,
        'wind_speed_10m': 0.0,
        'wind_gusts_10m': 0.0,
        'cloud_cover': 0.0,
        'relative_humidity_2m': 70.0,
        'dew_point_2m': 5.0,
        'surface_pressure': 1013.0,
    }

    def __init__(self, model: xgb.Booster, feature_store: FeatureStore,
                 feature_names: Sequence[str]):
        self.model = model
        self.fs = feature_store
        self.feature_names = list(feature_names)
        self._cell_id_to_idx = {int(c): i for i, c in enumerate(feature_store.cell_ids)}

    # -------- Cell lookup --------

    def cell_from_metric_xy(self, x: float, y: float) -> int:
        """Find nearest cell_id given metric coordinates (meters, EPSG:2180)."""
        d2 = (self.fs.centroid_x - x) ** 2 + (self.fs.centroid_y - y) ** 2
        return int(self.fs.cell_ids[int(np.argmin(d2))])

    def cell_from_latlon(self, lat: float, lon: float) -> int:
        """Find nearest cell_id given (lat, lon). Requires `pyproj`.

        Projects WGS84 → EPSG:2180 (Polish national grid).
        """
        try:
            from pyproj import Transformer
        except ImportError as e:
            raise ImportError("cell_from_latlon requires `pyproj`. Install: pip install pyproj") from e
        transformer = Transformer.from_crs('EPSG:4326', 'EPSG:2180', always_xy=True)
        x, y = transformer.transform(lon, lat)
        return self.cell_from_metric_xy(x, y)

    # -------- Feature builder --------

    def _build_feature_row(self, dt: datetime, cell_idx: int, weather: dict) -> dict:
        """Build a {feature_name: value} dict matching v3 feature engineering exactly."""
        # Snap to 6h window start: {0, 6, 12, 18}
        hour = (dt.hour // 6) * 6
        dow = dt.weekday()                 # 0 = Monday, matching pd.Timestamp.dayofweek
        month = dt.month
        year = dt.year
        is_weekend = 1 if dow >= 5 else 0
        # Match v3 definition: is_night = hour < 6 OR hour >= 22
        # With window-start hour ∈ {0, 6, 12, 18}, only hour=0 flags night.
        is_night = 1 if (hour < 6 or hour >= 22) else 0
        season_num = _SEASON_MAP[month]

        # Cyclical encodings (match v3 — sklearn-style 2π normalization)
        hour_sin = float(np.sin(2 * np.pi * hour / 24))
        hour_cos = float(np.cos(2 * np.pi * hour / 24))
        dow_sin = float(np.sin(2 * np.pi * dow / 7))
        dow_cos = float(np.cos(2 * np.pi * dow / 7))
        month_sin = float(np.sin(2 * np.pi * (month - 1) / 12))
        month_cos = float(np.cos(2 * np.pi * (month - 1) / 12))

        fs = self.fs
        # Cell-level lookups
        cell_past_rate = float(fs.cell_past_rate[cell_idx])
        cell_hour_past_rate = float(fs.cell_hour_past_rate[cell_idx, hour])
        cell_dow_past_rate = float(fs.cell_dow_past_rate[cell_idx, dow])
        nb_cell_past_rate = float(fs.nb_cell_past_rate[cell_idx])
        nb_cell_hour_past_rate = float(fs.nb_cell_hour_past_rate[cell_idx, hour])
        nb_cell_dow_past_rate = float(fs.nb_cell_dow_past_rate[cell_idx, dow])

        time_since_last_acc = float(fs.time_since_last_acc[cell_idx])
        recency_score = float(np.exp(-time_since_last_acc / fs.recency_half_life))

        a_lag_4 = float(fs.accidents_lag_sum_4[cell_idx])
        a_lag_28 = float(fs.accidents_lag_sum_28[cell_idx])
        a_lag_120 = float(fs.accidents_lag_sum_120[cell_idx])
        s_lag_4 = float(fs.spatial_lag_sum_4[cell_idx])
        s_lag_28 = float(fs.spatial_lag_sum_28[cell_idx])
        s_lag_120 = float(fs.spatial_lag_sum_120[cell_idx])

        cx_norm = float(fs.cx_norm[cell_idx])
        cy_norm = float(fs.cy_norm[cell_idx])
        centroid_x = float(fs.centroid_x[cell_idx])
        centroid_y = float(fs.centroid_y[cell_idx])

        w = weather
        # Interactions (exact v3 formulas)
        # NOTE: rush_hour_weekday checks hour ∈ {7,8,16,17} — but window-start hours are {0,6,12,18}.
        # This feature was effectively dead in training data; we preserve that by setting it to 0
        # for any window-aligned query. (If we ever support sub-window queries, revisit.)
        rush_hour_weekday = 0
        weekend_night = is_weekend * is_night
        slippery_score = int((w['rain'] > 0.1) and (w['temperature_2m'] < 5))
        low_visibility = int((w['cloud_cover'] > 80) or (w['relative_humidity_2m'] > 95))
        snow_wind = int((w['snow_depth'] > 0.01) and (w['wind_speed_10m'] > 5))
        is_frost = int(w['temperature_2m'] < 0)
        gust_ratio = float(w['wind_gusts_10m']) / (float(w['wind_speed_10m']) + 1.0)
        temp_diff = float(w['apparent_temperature']) - float(w['temperature_2m'])

        # Neighbor weather: assume city-uniform weather (Szczecin is small enough)
        nb_precipitation = float(w['precipitation'])
        nb_snow_depth = float(w['snow_depth'])
        nb_wind_speed_10m = float(w['wind_speed_10m'])

        return {
            # Weather raw
            'precipitation': float(w['precipitation']),
            'wind_speed_10m': float(w['wind_speed_10m']),
            'wind_gusts_10m': float(w['wind_gusts_10m']),
            'temperature_2m': float(w['temperature_2m']),
            'rain': float(w['rain']),
            'snow_depth': float(w['snow_depth']),
            'cloud_cover': float(w['cloud_cover']),
            'relative_humidity_2m': float(w['relative_humidity_2m']),
            'apparent_temperature': float(w['apparent_temperature']),
            'dew_point_2m': float(w['dew_point_2m']),
            'surface_pressure': float(w['surface_pressure']),
            'weather_code': float(w['weather_code']),
            # Time
            'hour': hour,
            'dow': dow,
            'month': month,
            'year': year,
            'hour_sin': hour_sin,
            'hour_cos': hour_cos,
            'dow_sin': dow_sin,
            'dow_cos': dow_cos,
            'month_sin': month_sin,
            'month_cos': month_cos,
            'is_weekend': is_weekend,
            'is_night': is_night,
            'season_num': season_num,
            # Conditional rates
            'cell_past_rate': cell_past_rate,
            'cell_hour_past_rate': cell_hour_past_rate,
            'cell_dow_past_rate': cell_dow_past_rate,
            # Lag sums
            'accidents_lag_sum_4': a_lag_4,
            'accidents_lag_sum_28': a_lag_28,
            'accidents_lag_sum_120': a_lag_120,
            'spatial_lag_sum_4': s_lag_4,
            'spatial_lag_sum_28': s_lag_28,
            'spatial_lag_sum_120': s_lag_120,
            # Recency
            'time_since_last_acc': time_since_last_acc,
            'recency_score': recency_score,
            # Position
            'cx_norm': cx_norm,
            'cy_norm': cy_norm,
            'centroid_x': centroid_x,
            'centroid_y': centroid_y,
            # Neighbor aggregates
            'nb_cell_past_rate': nb_cell_past_rate,
            'nb_cell_hour_past_rate': nb_cell_hour_past_rate,
            'nb_cell_dow_past_rate': nb_cell_dow_past_rate,
            'nb_precipitation': nb_precipitation,
            'nb_snow_depth': nb_snow_depth,
            'nb_wind_speed_10m': nb_wind_speed_10m,
            # Interactions
            'rush_hour_weekday': rush_hour_weekday,
            'weekend_night': weekend_night,
            'slippery_score': slippery_score,
            'low_visibility': low_visibility,
            'snow_wind': snow_wind,
            'is_frost': is_frost,
            'gust_ratio': gust_ratio,
            'temp_diff': temp_diff,
        }

    # -------- Validation --------

    def _validate_weather(self, weather: dict) -> dict:
        if weather is None:
            raise ValueError("weather dict is required")
        if 'weather_code' in weather:
            return {**self._WEATHER_DEFAULTS, **weather}
        missing = [k for k in self.WEATHER_KEYS if k not in weather]
        if missing:
            raise ValueError(f"Missing weather keys: {missing}")
        return weather

    def _resolve_cell(self, cell_id, lat, lon):
        if cell_id is not None:
            cid = int(cell_id)
            if cid not in self._cell_id_to_idx:
                raise ValueError(f"Unknown cell_id: {cid}")
            return cid, self._cell_id_to_idx[cid]
        if lat is not None and lon is not None:
            cid = self.cell_from_latlon(lat, lon)
            return cid, self._cell_id_to_idx[cid]
        raise ValueError("Provide either cell_id or (lat, lon)")

    def _normalize_time(self, time) -> datetime:
        if isinstance(time, str):
            return pd.Timestamp(time).to_pydatetime()
        if isinstance(time, pd.Timestamp):
            return time.to_pydatetime()
        if isinstance(time, datetime):
            return time
        raise ValueError(f"time must be str, datetime, or pd.Timestamp; got {type(time)}")

    # -------- Core API --------

    def predict(self, time, cell_id=None, lat=None, lon=None, weather=None,
                return_features=False) -> dict:
        """Predict accident risk for a 6h window at a location.

        Args:
            time: timestamp; will be snapped to nearest 6h window start.
            cell_id: explicit cell identifier, OR
            lat, lon: WGS84 coordinates (requires pyproj installed).
            weather: dict with all 12 WEATHER_KEYS.
            return_features: if True, include the full feature row in output.

        Returns dict with risk_probability, lift_over_baseline, etc.
        """
        dt = self._normalize_time(time)
        cell_id_resolved, cell_idx = self._resolve_cell(cell_id, lat, lon)
        weather = self._validate_weather(weather)

        feats = self._build_feature_row(dt, cell_idx, weather)

        x_row = np.array(
            [feats.get(name, 0.0) for name in self.feature_names],
            dtype=np.float32
        ).reshape(1, -1)

        if isinstance(self.model, xgb.Booster):
            dmat = xgb.DMatrix(x_row, feature_names=self.feature_names)
            prob = float(self.model.predict(dmat)[0])
        else:
            prob = float(self.model.predict_proba(x_row)[0, 1])

        # Snap time to window start
        snapped = dt.replace(hour=(dt.hour // 6) * 6, minute=0, second=0, microsecond=0)

        result = {
            'time_window': pd.Timestamp(snapped),
            'cell_id': cell_id_resolved,
            'cell_idx': cell_idx,
            'risk_probability': prob,
            'lift_over_baseline': prob / _BASELINE_RATE if prob > 0 else 0.0,
        }
        if return_features:
            result['features'] = feats
        return result

    def predict_grid(self, time, weather, sort=True) -> pd.DataFrame:
        """Predict risk for ALL cells at given time/weather. Returns DataFrame."""
        dt = self._normalize_time(time)
        weather = self._validate_weather(weather)

        N = len(self.fs.cell_ids)
        # Build feature matrix vectorized for speed (all N cells at once)
        rows = [self._build_feature_row(dt, i, weather) for i in range(N)]
        # Stack into matrix in feature_names order
        X = np.array(
            [[r.get(name, 0.0) for name in self.feature_names] for r in rows],
            dtype=np.float32
        )
        if isinstance(self.model, xgb.Booster):
            dmat = xgb.DMatrix(X, feature_names=self.feature_names)
            probs = self.model.predict(dmat)
        else:
            probs = self.model.predict_proba(X)[:, 1]

        out = pd.DataFrame({
            'cell_id': self.fs.cell_ids,
            'centroid_x': self.fs.centroid_x,
            'centroid_y': self.fs.centroid_y,
            'risk_probability': probs,
        })
        if sort:
            out = out.sort_values('risk_probability', ascending=False).reset_index(drop=True)
        return out

    # -------- Persistence --------

    def save(self, path: Union[str, Path]):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        if isinstance(self.model, xgb.Booster):
            self.model.save_model(str(path / 'model.json'))
        else:
            self.model.get_booster().save_model(str(path / 'model.json'))
        with open(path / 'feature_store.pkl', 'wb') as f:
            pickle.dump(self.fs, f)
        with open(path / 'feature_names.json', 'w') as f:
            json.dump(self.feature_names, f, indent=2)

    @classmethod
    def load(cls, path: Union[str, Path]):
        path = Path(path)
        booster = xgb.Booster()
        booster.load_model(str(path / 'model.json'))
        with open(path / 'feature_store.pkl', 'rb') as f:
            fs = _FeatureStoreUnpickler(f).load()
        with open(path / 'feature_names.json') as f:
            feature_names = json.load(f)
        return cls(booster, fs, feature_names)

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const now = new Date();

const twoYearsAgo = new Date(now);
twoYearsAgo.setFullYear(now.getFullYear() - 2);

export const defaultFilters = {
  minDate: formatDate(twoYearsAgo),
  maxDate: formatDate(now),
};

export const defaultZoom = 12;

export const maxZoomLevel = 18;

export const mapCenter = [14.556684989118507, 53.42750347047982];

export const extentConstraints = [
  [13.822174072265625, 53.10668594707314],
  [15.611572265625, 53.92245578080614]
];
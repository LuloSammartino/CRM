const ARGENTINE_DATE = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const ARGENTINE_TIME = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit"
});

function asDate(value: string | Date) {
  return value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
}

export function formatArgentineDate(value: string | Date) {
  const date = asDate(value);
  return Number.isNaN(date.valueOf()) ? String(value) : ARGENTINE_DATE.format(date);
}

export function formatArgentineDateTime(value: string | Date) {
  const date = asDate(value);
  return Number.isNaN(date.valueOf()) ? String(value) : `${ARGENTINE_DATE.format(date)}, ${ARGENTINE_TIME.format(date)}`;
}

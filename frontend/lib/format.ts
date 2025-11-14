const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
});

const numberFormatter = new Intl.NumberFormat("ru-RU");

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  return dateTimeFormatter.format(new Date(value));
};

export const formatDate = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  return dateFormatter.format(new Date(value));
};

export const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "—";
  }
  return numberFormatter.format(value);
};

export const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) {
    return "—";
  }
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
};

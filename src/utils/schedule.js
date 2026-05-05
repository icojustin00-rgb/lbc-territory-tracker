export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getCurrentMonthLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getAllDatesForDayInCurrentMonth(dayName) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const targetDay = dayMap[dayName];
  const dates = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    if (date.getDay() === targetDay) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

export function buildMonthlyScheduleInstances(territories) {
  const rows = [];

  territories.forEach((item) => {
    const dates = getAllDatesForDayInCurrentMonth(item.day);

    dates.forEach((dateObj) => {
      rows.push({
        ...item,
        dateObj,
        dateKey: getDateKey(dateObj),
        dateLong: formatLongDate(dateObj),
        dateShort: formatShortDate(dateObj),
      });
    });
  });

  rows.sort((a, b) => a.dateObj - b.dateObj);
  return rows;
}
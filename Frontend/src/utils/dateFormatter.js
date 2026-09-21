import { format, intervalToDuration, parseISO } from "date-fns";

//input: yyyy-MM-dd strings
//output: "03.12.-15.12.2025."
export function getFormattedDateRange(startDate, endDate) { 

  if (!startDate) { 
        return ""; 
    }
    
    if (!endDate || (startDate == endDate)) { 
        return format(parseISO(startDate), "dd.MM.yyyy."); 
    }

    if (startDate.slice(0, 4) == endDate.slice(0,4)) { 
        return `${format(parseISO(startDate), "dd.MM.")}-${format(parseISO(endDate), "dd.MM.yyyy.")}`; 
    }

    return `${format(parseISO(startDate), "dd.MM.yyyy.")}-${format(parseISO(endDate), "dd.MM.yyyy.")}`; 
}

//input: Date or yyyy-mm-dd string
//output: Mar 12, 2026
export function formatDate (dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
}

//input: Date
//output: 1yr 2mos (duration until today)
export function durationFromDate(date) {
  const duration = intervalToDuration({
    start: date,
    end: new Date(),
  });

  const parts = [];

  if (duration.years && duration.years > 0) {
    if (duration.years == 1) { 
      parts.push("1 yr");
    }
    else {
      parts.push(`${duration.years} yrs`);
    }
  }

  if (duration.months && duration.months > 0) {
    if (duration.months == 1) { 
      parts.push("1 mo");
    }
    else {
      parts.push(`${duration.months} mos`);
    }
  }

  if (parts.length === 0) {
    if (duration.days == 1) {
      parts.push(`1 day`);
    } else {
      parts.push(`${duration.days} days`);
    }
  }

  return parts.join(" ");
}

//input: Date
//output: yyyy-mm-dd
export function toYyyyMmDd(date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}
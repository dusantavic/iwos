import { useEffect, useMemo, useState } from "react";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";
import classNames from "classnames";
import api from "./utils/axiosInstance";
import AbsenceDetailsModal from "./AbsenceDetailsModal";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";

export default function CalendarsComponent({ isCompactView, startDate, employeeId }) {

  const [events, setEvents] = useState([]); 

  const [eventsForDetails, setEventsForDetails] = useState(null); 

  useEffect(() => {

    const fetchEvents = async () => {
      try {
        const response = await api.get(`/Employee/GetEvents?employeeId=${employeeId}&startDate=${startDate.toISOString().slice(0,10)}&endDate=${addMonths(startDate, 2).toISOString().slice(0,10)}`);
        setEvents(response.data);
      } catch (error) {
        console.log("Error while fetching calendar events.", error);
      }
    };

      
    fetchEvents();
  }, [startDate, eventsForDetails]);
  //@dusan: this is now being called each time next/prev button is clicked

  const months = useMemo(
    () => [startDate, addMonths(startDate, 1)],
    [startDate]
  );

  const eventMap = useMemo(() => {
    if (!events || events.length == 0) return;

    const map = new Map();

    for (const event of events) {
      const days = eachDayOfInterval({
        start: new Date(event.start),
        end: new Date(event.end),
      });

      days.forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          type: event.type, 
          status: event.status
        });
      });
    }

    return map;
  }, [events]);

  function parseYMDLocal(ymd) { 
    const [y,m,d] = ymd.split("-").map(Number); 
    return new Date(y, m-1, d, 0, 0, 0, 0); 
  }

  function atLocalMidnigth(d) { 
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()); 
  }

  function isWithinInclusive(dayDate, startStr, endStr) { 
    const day = atLocalMidnigth(dayDate); 
    const start = parseYMDLocal(startStr); 
    const end = endStr ? parseYMDLocal(endStr) : start; 

    const rangeStart = start <= end ? start : end; 
    const rangeEnd = start <= end ? end : start; 

    return day >= rangeStart && day <= rangeEnd; 
  }

  function onDayClick(clickedDay) { 
    const matches = events.filter(e => isWithinInclusive(clickedDay, e.start, e.end)); 
    setEventsForDetails(matches); 
  }
  
  const renderMonth = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    const paddingStart = start.getDay();

    return (
      <div className="bg-white shadow-md rounded-3xl p-8 w-full max-w-[900px] h-full flex flex-col border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          {format(monthDate, "MMMM yyyy")}
        </h2>
        <div className="grid grid-cols-7 gap-2 text-xs text-center text-gray-500">
          {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
            <div key={d} className="font-medium uppercase tracking-wide">
              {d}
            </div>
          ))}

          {Array(paddingStart)
            .fill(null)
            .map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventMap?.get(key) || []; 
            const mainEvent = dayEvents[0]; 
            const types = dayEvents.map(e => e.type); 
            

            if (!types || types.length == 0) {
              return (
                <div
                  key={key}
                  className="relative aspect-square w-full rounded-xl border border-gray-200 bg-gray-50 transition-colors flex flex-col items-center justify-center shadow-sm group hover:bg-gray-100 cursor-default"
                >
                  <span className="text-sm text-gray-800 font-semibold">
                    {day.getDate()}
                  </span>
                </div>
              );
            }

            const mainType = types[0];
            const additionalCount = types.length > 1 ? types.length : null;

            const isAbsent = types.some(
              (type) => type === "Vacation" || type === "Sick Leave" || type === "Justified Absence"
            );

            return (
              <div
                key={key}
                className={classNames(
                  "relative aspect-square w-full rounded-xl border border-gray-200 bg-gray-50 transition-colors flex flex-col items-center justify-center shadow-sm group hover:bg-gray-100 cursor-pointer",
                  {
                    "bg-gray-200": isAbsent,
                  }
                )}
                onClick={() => onDayClick(day)}
              >
                <span className="text-sm text-gray-800 font-semibold">
                  {day.getDate()}
                </span>

                {mainType && (
                  <div className="absolute bottom-1 right-1">
                    <div className="relative">
                      <div
                        className={`
                          w-6.5 h-6.5 flex items-center justify-center rounded-full text-white shadow-md
                          ${mainEvent.status == "Pending" ? "bg-gray-400" : EVENT_COLORS[mainType]}`
                        }
                      >
                        {EVENT_ICONS[mainType]}
                      </div>
                      {additionalCount && (
                        <div className="absolute inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full -top-2 -end-2 dark:border-gray-900">
                          {types.length}
                        </div>
                      )}
                  </div>
                  </div>
                )}

                {types.length > 0 && (
                  <div className="absolute z-10 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {isCompactView && (
                      <div className="font-semibold mb-1">
                        {format(new Date(key), "dd. MMM")}
                      </div>
                    )}
                    {types.join(", ")}
                    <p>{mainEvent.status == "Pending" && "(Pending)"}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      { 
        eventsForDetails && <AbsenceDetailsModal events={eventsForDetails} closeModal={() => {setEventsForDetails(null)}}/>
      }
      <div className="flex justify-center gap-4 flex-row">
        {months.map((month, idx) => (
          <div class="flex-grow" key={idx}>
            {renderMonth(month)}
          </div>
        ))}
      </div>
    </div>
  );
}

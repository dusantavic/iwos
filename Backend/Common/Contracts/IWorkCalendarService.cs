using Iwos.Business.WorkCalendar;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    /// <summary>
    /// Resolves, per employee per date, the working/off classification and the hours that count
    /// toward an absence request. Three regimes drive charging:
    ///  • StandardWeek (WeekEndsWorking = false) — Mon–Fri are charged, Sat/Sun off.
    ///  • Scheduled    (WeekEndsWorking = true and schedule covers the entire range) — charge real
    ///    assignments only; days without an assignment are off.
    ///  • Approximated (WeekEndsWorking = true and the schedule does not yet cover the range) —
    ///    chargedDays = round(calendarDays × WeeklyDays / 7).
    /// </summary>
    public interface IWorkCalendarService
    {
        Task<EmployeeWorkCalendar> BuildAsync(
            Guid employeeId,
            DateOnly start,
            DateOnly end,
            CancellationToken cancellationToken = default);
    }
}

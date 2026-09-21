using System;

namespace Iwos.Data.Model
{
    public class ShiftDayPositionRequirementOverride
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public Guid PositionId { get; set; }
        public int RequiredCount { get; set; }
        public virtual required Shift Shift { get; set; }
        public virtual required Position Position { get; set; }
    }
}

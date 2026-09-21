using System;

namespace Iwos.Common.DTOs
{
    public class SubscriptionPlanTypeDto
    {
        public Guid Id { get; set; }
        public required string Code { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int? DurationMonths { get; set; }
        public int? PlanningWindowMonths { get; set; }
    }
}

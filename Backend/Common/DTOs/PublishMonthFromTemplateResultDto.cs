using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    /// <summary>
    /// Summary of a bulk publish-for-month operation. Returned so the UI can
    /// toast how many weeks were stamped with the template, which of those
    /// weeks were already published (and therefore had their existing state
    /// replaced), and how many template assignments were skipped because the
    /// target employee was unavailable on that date — either via a shift-level
    /// unavailability report or via an approved absence (vacation, sick leave,
    /// justified absence) covering the target date.
    /// </summary>
    public record PublishMonthFromTemplateResultDto
    {
        public required int WeeksPublished { get; init; }
        public required int AssignmentsCreated { get; init; }
        public required int SkippedUnavailable { get; init; }
        public required List<DateOnly> OverriddenWeekStarts { get; init; }
    }
}

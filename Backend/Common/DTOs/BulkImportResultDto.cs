using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    public class BulkImportResultDto
    {
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<BulkImportRowErrorDto> Errors { get; set; } = new();
    }

    public class BulkImportRowErrorDto
    {
        public int Row { get; set; }
        public string? EmployeeName { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}

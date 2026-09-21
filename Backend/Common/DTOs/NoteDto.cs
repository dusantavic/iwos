using System;

namespace Iwos.Common.DTOs
{
	public class NoteDto
	{
		public Guid Id { get; set; }
		public Guid EmployeeId { get; set; }
		public required string Content { get; set; }
		public DateTime CreatedDateTime { get; set; }
		public string? Author { get; set; }
		public string? Employee { get; set; }
	}
}

using System;

namespace Iwos.Common.DTOs
{
	public class RecentNoteDto
	{
		public required string FullName { get; set; }
		public required string Content { get; set; }
		public DateTime CreatedDateTime { get; set; }
		public string? ProfilePictureSrc { get; set; }
		public required Guid EmployeeId { get; set; }
		public required string Author { get; set; }
		public required Guid AuthorId { get; set; }
	}
}

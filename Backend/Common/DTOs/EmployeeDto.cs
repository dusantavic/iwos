using System;

namespace Iwos.Common.DTOs
{
	public record EmployeeDto
	{
		public Guid Id { get; set; }
		public string? ContactEmail { get; set; }
		public required string FirstName { get; set; }
		public required string LastName { get; set; }
		public string? PersonalId { get; set; }
		public required string Position { get; set; }
		public required string Department { get; set; }
		public string? ProfilePictureSrc { get; set; }
		public string? Status { get; set; }
	}
}

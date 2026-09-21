using System;

namespace Iwos.Common.DTOs
{
	public class UpdateToDoDto
	{
		public required Guid Id { get; set; }
		public string? Content { get; set; }
		public bool? Completed { get; set; }
	}
}

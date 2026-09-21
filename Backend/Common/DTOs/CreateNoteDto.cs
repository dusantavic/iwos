using Iwos.Data.Model;
using System;

namespace Iwos.Common.DTOs
{
	public class CreateNoteDto
	{
		public Guid EmployeeId { get; set; }
		public required string Content { get; set; }

	}
}

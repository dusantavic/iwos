using System;

namespace Iwos.Common.DTOs
{
	public class UpdateNoteDto
	{
		public required Guid Id { get; set; }
		public required string Content { get; set; }
	}
}

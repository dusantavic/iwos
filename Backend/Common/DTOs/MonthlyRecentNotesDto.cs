using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class MonthlyRecentNotesDto
	{
		public required string Month { get; set; }
		public required List<RecentNoteDto> Notes { get; set; }
	}
}

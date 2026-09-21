using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class UpcomingEventDto : EventDto
	{
		public int DaysRemaining
		{
			get
			{
				var today = DateOnly.FromDateTime(DateTime.UtcNow);
				int diff = Start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)
					.Subtract(today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc))
					.Days;
				return diff > 0 ? diff : 0; 
			}
		}
	}
}

using Iwos.Data.Model;
using System.Collections.Generic;
using System;

namespace Iwos.Common.DTOs
{
	public class FileDto
	{
		public Guid Id { get; set; }
		public Guid? EmployeeId { get; set; }
		public required string DisplayName { get; set; }
	}
}

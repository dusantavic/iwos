using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
	public class Position
	{
		public Guid Id { get; set; }
		public required string Title { get; set; }
		public string? Description { get; set; }
		public Guid DepartmentId { get; set; }
		public virtual required Department Department { get; set; }
		public virtual ICollection<Employee>? Employees { get; set; }
	}
}

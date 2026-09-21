using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    public class Department
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public Guid ClientId { get; set; }
        public Guid? HeadId { get; set; }
        public virtual Employee? Head { get; set; }
        public DateOnly? CurrentHeadAssignmentDate { get; set; }
        public virtual required Client Client { get; set; }
		public virtual ICollection<Position>? Positions { get; set; }
	}
}

using Iwos.Common.Contracts;
using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    public class File : IActiveEntity
    {
        public Guid Id { get; set; }
        public required string DisplayName { get; set; }
        public required string FullSystemName { get; set; }
        public bool Active { get; set; } = true;
        public required string Path { get; set; }
        public required DateTime UploadedOn { get; set; } = DateTime.UtcNow;
        public required Guid UploadedById { get; set; }
        public Guid? EmployeeId { get; set; }

        public virtual ApplicationUser UploadedBy { get; set; }
        public virtual Employee? Employee { get; set; }
        public virtual ICollection<Client>? Clients { get; set; }
    }
}

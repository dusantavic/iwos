using System;

namespace Iwos.Data.Model
{
    public class Note
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public required string Content { get; set; }
        public DateTime CreatedDateTime { get; set; } = DateTime.UtcNow;
        public Guid? CreatedById { get; set; }
        public DateTime? LastModifiedAt { get; set; }
        public Guid? LastModifiedById { get; set; }
        public required bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public Guid? DeletedById { get; set; }

        public virtual required Employee Employee { get; set; }
        public virtual ApplicationUser? CreatedByUser { get; set; }
    }
}

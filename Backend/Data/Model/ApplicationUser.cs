using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    public class ApplicationUser : IdentityUser<Guid>, IActiveEntity
    {
        public required string FirstName { get; set; }

        public required string LastName { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public DateTime? ModifiedOn { get; set; }

        public DateTime? LastLogin { get; set; }

        public bool Active { get; set; } = false;

        public bool ReceiveEmail { get; set; } = false;

        public UserType Type { get; set; }

        public required Guid ClientId { get; set; }

        public virtual Client? Client { get; set; }

        public virtual required ICollection<IdentityUserClaim<Guid>> Claims { get; set; }
        public virtual required ICollection<File> Files { get; set; }
        public virtual ICollection<Note>? Notes { get; set; }
        public virtual ICollection<ToDo>? ToDos { get; set; }
	}
}

using System;

namespace Iwos.Common.Contracts
{
    public interface IActiveEntity
    {
        public Guid Id { get; set; }
        public bool Active { get; set; }
    }
}

using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class EmployeeEnumLookups
	{
		public List<EnumSelectItemDto> ContractTypeSelectItems { get; set; }
		public int AnnualVacationDays { get; } = 20;
	}
}

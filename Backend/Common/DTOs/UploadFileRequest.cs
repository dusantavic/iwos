using Microsoft.AspNetCore.Http;
using System;

namespace Iwos.Common.DTOs
{
	public class UploadFileRequest
	{
		public required IFormFile File { get; set; }
		public Guid EmployeeId { get; set; }
		public required string DisplayName { get; set; }
	}
}

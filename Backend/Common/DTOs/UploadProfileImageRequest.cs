using Microsoft.AspNetCore.Http;
using System;

namespace Iwos.Common.DTOs
{
	public class UploadProfileImageRequest
	{
		public required IFormFile File { get; set; }
		public Guid EmployeeId { get; set; }
	}
}

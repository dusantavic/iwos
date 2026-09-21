using Iwos.Common.DTOs;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;

namespace Iwos.Common.Extensions
{
	public static class EnumExtensions
	{
		public static string GetDisplayName(this Enum value)
		{
			return value.GetType()
				.GetMember(value.ToString())
				.FirstOrDefault()?
				.GetCustomAttribute<DisplayAttribute>()?
				.GetName()
				?? value.ToHumanReadable();
		}

		public static string ToHumanReadable(this Enum value)
		{
			return Regex.Replace(value.ToString(), "([a-z])([A-Z])", "$1 $2"); 
		}

		public static List<EnumSelectItemDto> ToSelectItemDtoList<TEnum>() where TEnum : struct, Enum
		{
			return Enum.GetValues<TEnum>()
				.Select(e => new EnumSelectItemDto
				{
					Value = Convert.ToInt32(e),
					Label = e.GetDisplayName()
				})
				.ToList(); 
		}
	}
}

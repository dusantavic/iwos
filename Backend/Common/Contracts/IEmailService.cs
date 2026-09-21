using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
	public interface IEmailService
	{
		Task SendEmail(string to, string subject, string htmlBody); 
	}
}

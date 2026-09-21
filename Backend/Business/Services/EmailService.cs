using Iwos.Common.Configurations;
using Iwos.Common.Contracts;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
	public class EmailService : IEmailService
	{
		private readonly EmailNotificationSettings _emailSettings;

		public EmailService(EmailNotificationSettings emailSettings)
		{
			_emailSettings = emailSettings;
		}

		public async Task SendEmail(string to, string subject, string htmlBody)
		{
			var message = new MimeMessage();

			message.From.Add(new MailboxAddress("Iwos", _emailSettings.EmailNotificationAddress));
			message.To.Add(new MailboxAddress("", to));
			message.Subject = subject;

			var builder = new BodyBuilder();

			var logoPath = Path.Combine(AppContext.BaseDirectory, "Templates", "logo.png");
			if (File.Exists(logoPath))
			{
				var logo = builder.LinkedResources.Add(logoPath);
				logo.ContentId = "iwos-logo";
				logo.ContentDisposition = new ContentDisposition(ContentDisposition.Inline);
			}

			builder.HtmlBody = htmlBody;
			message.Body = builder.ToMessageBody();

			using var client = new SmtpClient();
			await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
			await client.AuthenticateAsync(_emailSettings.EmailNotificationAddress, _emailSettings.EmailNotificationAddressPassword);

			await client.SendAsync(message);
			await client.DisconnectAsync(true);
		}
	}
}

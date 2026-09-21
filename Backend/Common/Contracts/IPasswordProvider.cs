namespace Iwos.Common.Contracts
{
    public interface IPasswordProvider
    {
        string GetPasswordHash(string password);
        bool AreHashsEquals(string hashedPassword, string providedPassword);
    }
}

namespace Iwos.Common.Contracts.Enums
{
    public enum ClientBilling : byte
    {
        Free = 0,
        Paid = 1,
        OverDue = 2,
        PastDue = 3 // Transaction failed, but not overdue yet
    }
}

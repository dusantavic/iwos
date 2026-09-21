namespace Iwos.Business.Scheduling
{
    /// <summary>
    /// Smart shift scheduler. Given a fully-loaded <see cref="SchedulingContext"/>,
    /// returns a <see cref="SchedulingResult"/> containing proposed assignments
    /// and any diagnostics. Pure — does not touch the database.
    /// </summary>
    public interface IShiftSchedulingEngine
    {
        SchedulingResult Generate(SchedulingContext context);
    }
}

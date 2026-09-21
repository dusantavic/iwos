using Autofac;
using Iwos.Business.Providers;
using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Business.Scheduling.Optimizer;
using Iwos.Business.Services;
using Iwos.Common.Contracts;
using Iwos.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Iwos.Bootstrap
{
    public sealed class AutofacModule : Module
    {
        public AutofacModule()
        { }

        protected override void Load(ContainerBuilder builder)
        {
            builder.RegisterAssemblyTypes(typeof(EmployeeRepository).Assembly)
                .Where(t => t.Name.EndsWith("Repository"))
                .AsImplementedInterfaces()
                .InstancePerLifetimeScope();

            builder.RegisterAssemblyTypes(typeof(EmployeeService).Assembly)
                .Where(t => t.Name.EndsWith("Service"))
                .AsImplementedInterfaces()
                .InstancePerLifetimeScope();

            builder.RegisterAssemblyTypes(typeof(PasswordProvider).Assembly)
                .Where(t => t.Name.EndsWith("Provider"))
                .AsImplementedInterfaces()
                .InstancePerLifetimeScope();

            builder.RegisterType<AdminAuditLogger>()
                .As<IAdminAuditLogger>()
                .InstancePerLifetimeScope();

            // ── Scheduling engine + constraints ───────────────────────────────
            // Any new IScheduleConstraint implementation is picked up automatically.
            builder.RegisterAssemblyTypes(typeof(ShiftSchedulingEngine).Assembly)
                .Where(t => typeof(IScheduleConstraint).IsAssignableFrom(t) && !t.IsAbstract && !t.IsInterface)
                .As<IScheduleConstraint>()
                .InstancePerLifetimeScope();

            builder.RegisterType<ShiftSchedulingEngine>()
                .As<IShiftSchedulingEngine>()
                .InstancePerLifetimeScope();

            builder.RegisterType<ScheduleLocalSearchOptimizer>()
                .AsSelf()
                .InstancePerLifetimeScope();
        }
	}
}

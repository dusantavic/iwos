using AutoMapper;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Data.Model;

namespace Iwos.Bootstrap
{
    public sealed class GeneralMapperProfile : Profile
    {
        public GeneralMapperProfile()
        {
            CreateMap<ApplicationUser, UserDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id.ToString()))
                .ReverseMap();

            CreateMap<ApplicationUser, UserModelDto>()
                .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.UserName))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email));

            CreateMap<UserModelDto, ApplicationUser>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Username))
                .ForMember(dest => dest.NormalizedUserName, opt => opt.MapFrom(src => src.Username.ToUpperInvariant()))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
                .ForMember(dest => dest.NormalizedEmail, opt => opt.MapFrom(src => src.Email.ToUpperInvariant()));

            CreateMap<Client, ClientDto>().ReverseMap();


            CreateMap<Employee, EmployeeDetailsDto>()
                .ForMember(dest => dest.Position, opt =>
                    opt.MapFrom((src, dest) =>
                        src.Position?.Title))
                .ForMember(dest => dest.Department, opt =>
                    opt.MapFrom((src, dest) =>
                        src.Position?.Department?.Name))
                .ForMember(dest => dest.DepartmentId, opt =>
                    opt.MapFrom((src, dest) =>
                        src.Position?.DepartmentId));

            CreateMap<Employee, CreateEmployeeDto>();
            CreateMap<CreateEmployeeDto, Employee>()
                .ForMember(dest => dest.ContractType, opt =>
                    opt.MapFrom(src => (ContractType?)src.ContractType));

            CreateMap<Note, NoteDto>()
                .ForMember(dest => dest.Author, opt =>
                    opt.MapFrom((src, dest) =>
                        $"{src.CreatedByUser?.FirstName} {src.CreatedByUser?.LastName}"))
                .ForMember(dest => dest.Employee, opt =>
                    opt.MapFrom((src, dest) =>
                        $"{src.Employee?.FirstName} {src.Employee?.LastName}"));

            CreateMap<NoteDto, Note>();
            CreateMap<CreateNoteDto, Note>();

            CreateMap<ToDo, ToDoDto>()
                .ForMember(dest => dest.Author, opt =>
                    opt.MapFrom((src, dest) =>
                        $"{src.CreatedByUser?.FirstName} {src.CreatedByUser?.LastName}"))
                .ForMember(dest => dest.Employee, opt =>
                    opt.MapFrom((src, dest) =>
                        $"{src.Employee?.FirstName} {src.Employee?.LastName}"));


            CreateMap<CreatePositionDto, Position>().ReverseMap();

            CreateMap<ToDoDto, ToDo>();
            CreateMap<CreateToDoDto, ToDo>();

            CreateMap<EventDto, UpcomingEventDto>().ReverseMap();
            CreateMap<CreateAbsenceDto, Absence>().ReverseMap();
        }
    }
}

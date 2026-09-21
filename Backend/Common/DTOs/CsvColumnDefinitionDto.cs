namespace Iwos.Common.DTOs
{
    public class CsvColumnDefinitionDto
    {
        public string Header { get; set; } = string.Empty;
        public bool Required { get; set; }
        public string Example { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}

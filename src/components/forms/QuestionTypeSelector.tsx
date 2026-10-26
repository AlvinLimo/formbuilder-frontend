"use client";

type QuestionTypeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const questionTypes = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "EMAIL",
  "PHONE",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
  "YES_NO",
  "RATING",
  "LINEAR_SCALE",
  "DATE",
  "FILE_UPLOAD",
  "SECTION_HEADER",
];

export default function QuestionTypeSelector({
  value,
  onChange,
}: QuestionTypeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border p-2"
    >
      {questionTypes.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
}
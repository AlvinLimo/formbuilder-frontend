export type FieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "EMAIL"
  | "PHONE"
  | "RADIO"
  | "CHECKBOX"
  | "SELECT"
  | "YES_NO"
  | "RATING"
  | "LINEAR_SCALE"
  | "DATE"
  | "FILE"
  | "HEADING"
  | "INSTRUCTION";

export type FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type TipTapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TipTapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TipTapMark[];
  content?: TipTapNode[];
};

export type TipTapDoc = {
  type: "doc";
  content?: TipTapNode[];
};

export type FormOption = {
  id: string;
  label: string;
};

export type FieldValidation = {
  minLength?: number | null;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  minLabel?: string | null;
  maxLabel?: string | null;
  allowedMimeTypes?: string[] | null;
  maxFileSizeMb?: number | null;
};

export type FormField = {
  id: string;
  label: string;
  titleDoc: TipTapDoc | null;
  descriptionDoc: TipTapDoc | null;
  type: FieldType;
  required: boolean;
  options: FormOption[];
  validation: FieldValidation | null;
  order: number;
};

export type FormSection = {
  id: string;
  title: string;
  titleDoc: TipTapDoc | null;
  descriptionDoc: TipTapDoc | null;
  order: number;
  fields: FormField[];
};

export type FormRole = "OWNER" | "EDITOR";

export type FormRecord = {
  id: string;
  role?: FormRole;
  owner?: AuthUser | null;
  title: string;
  description: string | null;
  titleDoc: TipTapDoc | null;
  descriptionDoc: TipTapDoc | null;
  status: FormStatus;
  publicId: string | null;
  limitOneResponse: boolean;
  createdAt: string;
  updatedAt: string;
  sections: FormSection[];
};

export type PublicFormRecord = FormRecord & {
  hasResponded: boolean;
  assigned: boolean;
};

export type Collaborator = AuthUser & {
  addedAt: string;
};

export type Assignee = AuthUser & {
  assignedAt: string;
  submittedAt: string | null;
  status: "PENDING" | "SUBMITTED";
};

export type InboxItem = {
  id: string;
  form: { id: string; title: string; status: FormStatus; publicId: string | null };
  assignedBy: AuthUser | null;
  assignedAt: string;
  submittedAt: string | null;
  status: "PENDING" | "SUBMITTED" | "CLOSED";
};

export type Inbox = {
  pendingCount: number;
  assignments: InboxItem[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export type FileAnswer = {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type AnswerValue = string | number | boolean | string[] | FileAnswer;

export type SubmissionColumn = {
  id: string;
  label: string;
  deleted: boolean;
  type: FieldType;
};

export type SubmissionTable = {
  form: {
    id: string;
    title: string;
    status: FormStatus;
    publicId: string | null;
  };
  columns: SubmissionColumn[];
  rows: Array<{
    id: string;
    createdAt: string;
    submittedBy: { name: string; email: string } | null;
    answers: Record<string, string>;
    files: Record<string, { path: string; fileName: string }>;
  }>;
};

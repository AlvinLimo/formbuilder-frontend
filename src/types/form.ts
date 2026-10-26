export type FormStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "CLOSED";

export interface Form {
  id: string;
  title: string;
  description?: string;
  status: FormStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormData {
  title: string;
  description: string;
}


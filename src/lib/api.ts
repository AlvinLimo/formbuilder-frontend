import type {
  Assignee,
  AuthResult,
  AuthUser,
  Collaborator,
  FormRecord,
  Inbox,
  PublicFormRecord,
  SubmissionTable,
} from "@/lib/types";
import { getRespondentKey, getToken, SESSION_EXPIRED_EVENT, setToken } from "@/lib/session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  fieldId?: string;
  status?: number;

  constructor(message: string, fieldId?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.fieldId = fieldId;
    this.status = status;
  }
}

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

async function send(path: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const token = getToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; fieldId?: string };
    throw new ApiError(payload.error ?? "Request failed", payload.fieldId, response.status);
  }

  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json().catch(() => ({}))) as T;
}

function postJson<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export function register(body: { name: string; email: string; password: string }) {
  return postJson<AuthResult>("/auth/register", body);
}

export function login(body: { email: string; password: string }) {
  return postJson<AuthResult>("/auth/login", body);
}

export function getMe() {
  return request<{ user: AuthUser }>("/auth/me");
}

export function listForms() {
  return request<FormRecord[]>("/forms");
}

export function getForm(id: string) {
  return request<FormRecord>(`/forms/${id}`);
}

export function createForm(body: { title: string; description?: string }) {
  return postJson<FormRecord>("/forms", body);
}

export function updateForm(id: string, body: unknown) {
  return request<FormRecord>(`/forms/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function duplicateForm(id: string) {
  return postJson<FormRecord>(`/forms/${id}/duplicate`);
}

export function deleteForm(id: string) {
  return request<void>(`/forms/${id}`, { method: "DELETE" });
}

export function publishForm(id: string) {
  return postJson<FormRecord>(`/forms/${id}/publish`);
}

export function closeForm(id: string) {
  return postJson<FormRecord>(`/forms/${id}/close`);
}

export function getPublicForm(publicId: string) {
  return request<PublicFormRecord>(`/public/forms/${publicId}?respondent=${getRespondentKey()}`);
}

export function submitPublicForm(publicId: string, data: Record<string, unknown>) {
  return postJson<{ id: string }>(`/public/forms/${publicId}/submissions`, {
    data,
    respondentKey: getRespondentKey(),
  });
}

export function uploadPublicFile(publicId: string, fieldId: string, file: File) {
  const body = new FormData();
  body.set("fieldId", fieldId);
  body.set("file", file);
  return request<import("@/lib/types").FileAnswer>(`/public/forms/${publicId}/files`, {
    method: "POST",
    body,
  });
}

export function searchUsers(query: string) {
  return request<AuthUser[]>(`/users/search?q=${encodeURIComponent(query)}`);
}

export function getCollaborators(formId: string) {
  return request<Collaborator[]>(`/forms/${formId}/collaborators`);
}

export function addCollaborators(formId: string, userIds: string[]) {
  return postJson<Collaborator[]>(`/forms/${formId}/collaborators`, { userIds });
}

export function removeCollaborator(formId: string, userId: string) {
  return request<void>(`/forms/${formId}/collaborators/${userId}`, { method: "DELETE" });
}

export function getAssignments(formId: string) {
  return request<Assignee[]>(`/forms/${formId}/assignments`);
}

export function addAssignments(formId: string, userIds: string[]) {
  return postJson<Assignee[]>(`/forms/${formId}/assignments`, { userIds });
}

export function removeAssignment(formId: string, userId: string) {
  return request<void>(`/forms/${formId}/assignments/${userId}`, { method: "DELETE" });
}

export function getInbox() {
  return request<Inbox>("/me/assignments");
}

export function getSubmissions(id: string) {
  return request<SubmissionTable>(`/forms/${id}/submissions`);
}

async function download(path: string, fileName: string) {
  const blob = await (await send(path)).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadFile(formId: string, path: string, fileName: string) {
  return download(`/forms/${formId}/files/download?path=${encodeURIComponent(path)}`, fileName);
}

export function downloadCsv(formId: string) {
  return download(`/forms/${formId}/submissions.csv`, "responses.csv");
}

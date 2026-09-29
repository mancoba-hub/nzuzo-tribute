export interface Tribute {
  id: string;
  name: string;
  community: string | null;
  contact?: string | null;
  message: string;
  photo: string | null;
  createdAt: string;
  hidden?: boolean;
}

const TOKEN_KEY = "nzuzo-admin-token";

export const adminToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value: string) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as { error?: string }).error || "ERROR";
    throw new ApiError(code, res.status);
  }
  return data as T;
}

export async function submitTribute(form: FormData): Promise<Tribute> {
  const res = await fetch("/api/tributes", { method: "POST", body: form });
  const data = await parse<{ tribute: Tribute }>(res);
  return data.tribute;
}

export async function listTributes(): Promise<Tribute[]> {
  const res = await fetch("/api/tributes");
  const data = await parse<{ tributes: Tribute[] }>(res);
  return data.tributes;
}

export async function adminLogin(password: string): Promise<string> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await parse<{ token: string }>(res);
  return data.token;
}

const authHeaders = () => ({ Authorization: `Bearer ${adminToken.get()}` });

export async function adminList(): Promise<Tribute[]> {
  const res = await fetch("/api/admin/tributes", { headers: authHeaders() });
  const data = await parse<{ tributes: Tribute[] }>(res);
  return data.tributes;
}

export async function adminSetHidden(id: string, hidden: boolean): Promise<void> {
  await fetch(`/api/admin/tributes/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ hidden }),
  }).then((res) => parse(res));
}

export async function adminDelete(id: string): Promise<void> {
  await fetch(`/api/admin/tributes/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then((res) => parse(res));
}

async function download(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new ApiError("DOWNLOAD_FAILED", res.status);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const adminExportCsv = () => download("/api/admin/export.csv", "nzuzo-tributes.csv");
export const adminExportZip = () => download("/api/admin/export.zip", "nzuzo-tribute-photos.zip");

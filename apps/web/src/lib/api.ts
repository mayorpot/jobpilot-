
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiOptions = RequestInit & {
  authenticated?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  // Whether an endpoint requires login is separate from whether
  // the browser should accept and send session cookies.
  const { authenticated: _authenticated, ...requestOptions } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: "include",
    headers: {
      ...requestOptions.headers,
      ...(requestOptions.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
  });

  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(
      data?.error ?? `Request failed with status ${response.status}`
    );
  }

  return data as T;
}
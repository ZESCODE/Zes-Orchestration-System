import { useState, useCallback, useRef, useEffect } from "react";

// ── Generic fetch with error handling ──

export async function apiFetch(path, options = {}) {
  const { method = "GET", body, baseUrl = "" } = options;
  const fetchOptions = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) fetchOptions.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, fetchOptions);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Expected JSON from ${res.url}, got ${contentType.split(";")[0]}: ${text.slice(0, 100)}`
    );
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

// ── useApi: generic hook with loading/error state ──

export function useApi(baseUrl = "") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const handleResponse = useCallback(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Expected JSON from ${response.url}, got ${contentType.split(";")[0]}: ${text.slice(0, 100)}`
      );
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  }, []);

  const fetchApi = useCallback(
    async (method, path, body = null, options = {}) => {
      setLoading(true);
      setError(null);
      try {
        const fetchOptions = {
          method,
          headers: { "Content-Type": "application/json" },
        };
        if (body) fetchOptions.body = JSON.stringify(body);

        const res = await fetch(`${baseUrl}${path}`, fetchOptions);
        const data = await handleResponse(res);
        if (mountedRef.current) setLoading(false);
        return data;
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
        throw err;
      }
    },
    [baseUrl, handleResponse]
  );

  const get = useCallback((path, options) => fetchApi("GET", path, null, options), [fetchApi]);
  const post = useCallback((path, body, options) => fetchApi("POST", path, body, options), [fetchApi]);
  const del = useCallback((path, options) => fetchApi("DELETE", path, null, options), [fetchApi]);

  return { get, post, del, loading, error };
}

// ── Service-specific hooks (re-imported by existing components) ──

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      const data = await apiFetch("/api/services");
      setServices(data.services || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const controlService = useCallback(async (name, action) => {
    try {
      await apiFetch(`/api/services/${name}/${action}`, { method: "POST" });
      await fetchServices();
    } catch {}
  }, [fetchServices]);

  return { services, loading, controlService };
}

export function useSystemInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/system")
      .then((d) => { setInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { info, loading };
}

export function useNetwork() {
  const [net, setNet] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/network")
      .then((d) => { setNet(d.interfaces || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { net, loading };
}

export function useProcesses() {
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/processes")
      .then((d) => { setProcs(d.processes || d.procs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { procs, loading };
}

export function useWebServices() {
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/web-services")
      .then((d) => { setServices(d.services || d.web_services || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { services, loading };
}

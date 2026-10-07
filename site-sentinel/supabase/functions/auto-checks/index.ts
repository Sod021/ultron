import { createClient, type User } from "npm:@supabase/supabase-js@2.49.1";

type Website = {
  id: number;
  name: string;
  url: string;
};

type AutoCheckInsert = {
  user_id: string;
  website_id: number;
  website_name: string;
  website_url: string;
  status_code: number | null;
  error_type: string;
  response_time_ms: number | null;
  checked_at: string;
  is_live: boolean;
};

const SUPABASE_URL = Deno.env.get("SB_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";
const TIMEOUT_MS = 12000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    const duration = Math.round(performance.now() - startedAt);
    return { response, duration };
  } finally {
    clearTimeout(timeout);
  }
};

const classifyError = (status: number | null, error: string | null) => {
  if (error === "timeout") return "timeout";
  if (error === "dns") return "dns";
  if (status === 403) return "403";
  if (status && status >= 500) return "500";
  if (status && status >= 400) return "http";
  return "ok";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getAllUserIds = async () => {
  const userIds: string[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    userIds.push(...data.users.map((user: User) => user.id));
    if (data.users.length < 1000) break;
    page += 1;
  }

  return userIds;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase env vars", { status: 500, headers: corsHeaders });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const isScheduledRun = token === SUPABASE_SERVICE_ROLE_KEY;
  const { data: userData } = isScheduledRun
    ? { data: { user: null } }
    : await supabase.auth.getUser(token);

  if (!isScheduledRun && !userData.user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let recipientUserIds: string[];
  try {
    recipientUserIds = isScheduledRun
      ? await getAllUserIds()
      : [userData.user!.id];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load users";
    return new Response(message, { status: 500, headers: corsHeaders });
  }

  const { data: websites, error } = await supabase
    .from("websites")
    .select("id, name, url")
    .eq("is_shared", true);

  if (error) {
    return new Response(`Failed to load websites: ${error.message}`, { status: 500, headers: corsHeaders });
  }

  if (recipientUserIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("auto_checks")
      .delete()
      .in("user_id", recipientUserIds);
    if (deleteError) {
      return new Response(`Failed to clear previous checks: ${deleteError.message}`, { status: 500, headers: corsHeaders });
    }
  }

  const now = new Date().toISOString();
  const inserts: AutoCheckInsert[] = [];

  for (const site of (websites || []) as Website[]) {
    let statusCode: number | null = null;
    let responseTime: number | null = null;
    let isLive = false;
    let errorType = "unknown";

    try {
      const { response, duration } = await fetchWithTimeout(site.url);
      statusCode = response.status;
      responseTime = duration;
      isLive = response.status >= 200 && response.status < 400;
      errorType = classifyError(statusCode, null);
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      const isTimeout = message.includes("abort") || message.includes("timeout");
      const isDns = message.includes("dns") || message.includes("name not resolved");
      errorType = classifyError(null, isTimeout ? "timeout" : isDns ? "dns" : "http");
    }

    for (const userId of recipientUserIds) {
      inserts.push({
        user_id: userId,
        website_id: site.id,
        website_name: site.name,
        website_url: site.url,
        status_code: statusCode,
        error_type: errorType,
        response_time_ms: responseTime,
        checked_at: now,
        is_live: isLive,
      });
    }
  }

  if (inserts.length === 0) {
    return new Response(JSON.stringify({ inserted: 0 }), { status: 200, headers: corsHeaders });
  }

  const { error: insertError } = await supabase.from("auto_checks").insert(inserts);
  if (insertError) {
    return new Response(`Failed to insert checks: ${insertError.message}`, { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      checked: (websites || []).length,
      recipients: recipientUserIds.length,
      inserted: inserts.length,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

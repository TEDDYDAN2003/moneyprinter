import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  // Explicit opt-in; never run a local Python bridge on the hosted deployment.
  if (process.env.RESEARCH_LOCAL_ENABLED !== "1") return NextResponse.json({error:"Local research is disabled. See research/README.md."},{status:403});
  const host = request.headers.get("host") || "";
  // Only accept requests made to a local development server.
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return NextResponse.json({error:"Research is available only through localhost."},{status:403});
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== host) return NextResponse.json({error:"Invalid origin."},{status:403});
  const auth = await getAuthenticatedUser();
  if (auth.supabaseConfigured && !auth.user) return NextResponse.json({error:"Sign in first."},{status:401});
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({error:"Invalid JSON."},{status:400}); }
  const child=spawn("python3",[path.join(process.cwd(),"research","run.py")],{env:process.env,stdio:["pipe","pipe","pipe"]});
  const outcome=await new Promise<{body:string;ok:boolean}>((resolve)=>{
    let body="",failed=false;
    const timer=setTimeout(()=>{failed=true;child.kill();resolve({body:'{"error":"Research process timed out."}',ok:false});},180000);
    child.stdout.on("data",(chunk:Buffer)=>{body+=chunk.toString();if(body.length>150_000_000){failed=true;child.kill();}});
    child.stderr.on("data",()=>{});
    child.on("error",()=>{clearTimeout(timer);resolve({body:'{"error":"Could not start Python 3."}',ok:false});});
    child.on("close",(code)=>{clearTimeout(timer);resolve({body:failed?'{"error":"Research response exceeded the local size limit. Try fewer candles."}':body,ok:code===0&&!failed});});
    child.stdin.end(JSON.stringify(input));
  });
  try{return NextResponse.json(JSON.parse(outcome.body),{status:outcome.ok?200:400});}catch{return NextResponse.json({error:"Research process failed."},{status:500});}
}

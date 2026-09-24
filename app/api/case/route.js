export async function POST(req){
  const key=process.env.ANTHROPIC_API_KEY;
  let t; try{t=await req.json()}catch{return Response.json({error:"Bad request."},{status:400})}
  if(!key){
    const a=["Compare FDMS sales receipts with the VAT 7 returns for the last 3 periods."];
    if(t.importMismatch)a.push("Reconcile ASYCUDA import declarations against reported stock and sales.");
    if(t.hsCodeIssue)a.push("Check that zero-rated and exempt lines carry full 8-digit HS codes.");
    if(t.linkedFirms)a.push("Review shared directors, addresses and bank accounts with related firms.");
    a.push("Confirm the fiscal device has uploaded data without gaps.");
    return Response.json({text:"Summary: "+t.taxpayer+" ("+t.sector+") has a risk score of "+t.riskScore+"/100. VAT recorded on fiscal devices is $"+t.fdmsVatUSD.toLocaleString()+" but $"+t.declaredVatUSD.toLocaleString()+" was declared, a gap of "+t.vatGapPercent+"%. This is a lead for review, not proof of wrongdoing.\n\nAudit checklist:\n- "+a.join("\n- ")+"\n\n(Built-in demo summary. Connect an AI key to generate custom summaries and letters.)"})}
  const body=JSON.stringify(t).slice(0,3000);
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
    headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:"claude-sonnet-5",max_tokens:700,
      system:"You assist a tax authority officer. Given a taxpayer risk record (synthetic demo data), write: 1) a 3-sentence plain-English summary of why it was flagged, 2) a short audit checklist (max 5 items), 3) a polite 4-line draft letter requesting records. Use only the facts given, never invent figures, and state that a flag is a lead for review, not proof of wrongdoing.",
      messages:[{role:"user",content:body}]})});
  const d=await r.json();
  if(!r.ok) return Response.json({error:d?.error?.message||"AI service error."},{status:502});
  return Response.json({text:(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")});
}

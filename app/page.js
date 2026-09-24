"use client";
import {useState} from "react";
const D=[["Zambezi Traders","Wholesale",184000,121000,0,1,0],["Kariba Fuel Supplies","Fuel",96000,90500,1,0,0],["Mbare Auto Spares","Retail",72000,71200,0,0,0],["Highveld Steel & Co","Manufacturing",240000,150000,1,1,1],["Save Valley Foods","Food",58000,55800,0,0,0],["Bulawayo Tech Imports","Electronics",133000,88000,1,1,0],["Gweru Building Supplies","Construction",64000,61000,0,0,0],["Eastern Cross Logistics","Transport",110000,84000,1,0,1]];
const N={H:"High",M:"Medium",L:"Low"};
function calc(r){const g=(r[2]-r[3])/r[2]*100,s=Math.round(Math.min(100,g*1.6+r[4]*20+r[5]*15+r[6]*20));return{g,s,l:s>=60?"H":s>=30?"M":"L"}}
export default function Page(){
  const [sel,setSel]=useState(null),[txt,setTxt]=useState(""),[busy,setBusy]=useState(false),[err,setErr]=useState("");
  const rows=D.map((r,i)=>({r,i,c:calc(r)})).sort((a,b)=>b.c.s-a.c.s);
  async function ask(o){setBusy(true);setErr("");setTxt("");
    try{const res=await fetch("/api/case",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({taxpayer:o.r[0],sector:o.r[1],fdmsVatUSD:o.r[2],declaredVatUSD:o.r[3],vatGapPercent:+o.c.g.toFixed(1),importMismatch:!!o.r[4],hsCodeIssue:!!o.r[5],linkedFirms:!!o.r[6],riskScore:o.c.s})});
      const d=await res.json();if(!res.ok)throw new Error(d.error);setTxt(d.text)}catch(e){setErr(e.message)}setBusy(false)}
  const o=sel!==null?rows.find(x=>x.i===sel):null;
  return <main>
    <h1>ZIMRA Revenue Intelligence</h1>
    <p className="s">Prototype AI risk layer across fiscal-device sales (FDMS), VAT returns (TaRMS) and customs data (ASYCUDA).</p>
    <h2>National picture <span className="tag real">Published figures</span></h2>
    <div className="grid">
      <div className="k"><b>US$9.2bn</b><span>2026 collection target</span></div>
      <div className="k"><b>US$4.34bn</b><span>Net collections Jan to May 2026 (+47%)</span></div>
      <div className="k"><b>US$7.65bn</b><span>2025 collections (US$4.56bn in 2021)</span></div>
      <div className="k"><b>76.1%</b><span>Informal share of economy (estimate)</span></div>
    </div>
    <h2>Risk engine <span className="tag syn">Synthetic taxpayers</span></h2>
    <p className="s">Select a taxpayer, then generate an AI case summary.</p>
    <div className="wrap"><table><thead><tr><th>Taxpayer</th><th>Sector</th><th>FDMS VAT</th><th>Declared</th><th>Gap</th><th>Score</th></tr></thead><tbody>
      {rows.map(x=><tr key={x.i} className={"r"+(sel===x.i?" sel":"")} onClick={()=>{setSel(x.i);setTxt("");setErr("")}}>
        <td>{x.r[0]}</td><td>{x.r[1]}</td><td>${x.r[2].toLocaleString()}</td><td>${x.r[3].toLocaleString()}</td><td>{x.c.g.toFixed(1)}%</td><td className={"sc "+x.c.l}>{x.c.s} {N[x.c.l]}</td></tr>)}
    </tbody></table></div>
    <div className="case">{o?<>
      <b>{o.r[0]}: {N[o.c.l]} risk ({o.c.s}/100)</b><div className="s">VAT gap {o.c.g.toFixed(1)}% between fiscal-device data and the return.</div>
      <button disabled={busy} onClick={()=>ask(o)}>{busy?"Generating...":"Generate AI case summary"}</button>
      {err&&<p className="out H">{err}</p>}{txt&&<div className="out">{txt}</div>}</>:<span className="s">Select a taxpayer above.</span>}</div>
    <footer>Sources: NewsDay (30 Jun 2026), Business Times (Nov 2025), Zimbabwe Situation (Feb 2026). Taxpayer records are synthetic. Flags are leads for review, not proof of wrongdoing.</footer>
  </main>}

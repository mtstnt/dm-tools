"use client"

import React, { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { UserCheck } from "lucide-react"

type Availability = "teen" | "youth" | "both"
type Member = {
  id: number
  name: string
  color?: string
  availability?: Availability
}

type EventState = {
  assignments: Record<string, string[]>
  sr: { tcIn: string | null; tcOut: string | null; fd: string | null }
}

/* Constants ported from original JSX */
const COLORS = [
  '#FF6B6B','#4ECDC4','#FFD93D','#6BCB77','#4D96FF',
  '#FF9A8B','#C77DFF','#FFB347','#00D4AA','#FF6FC8',
  '#52B788','#FFCB69','#F15BB5','#00BBF9','#8338EC',
  '#F4845F','#A8DADC','#FF595E','#06D6A0','#FEE440',
]

const WEIGHTS: Record<number, Record<string, number>> = {
  0: { A1:0.4, A2:0.5, A3:0.4, A4:0.2, B1:0.08, B2:0.1, B3:0.05, S1:0.02, S2:0.02 },
  1: { A1:0.7, A2:0.6, A3:0.8, A4:0.5, B1:0.1,  B2:0.3, B3:0.1,  S1:0.02, S2:0.02 },
}

const ADJ: Record<string, string[]> = {
  A1:['S1','B1'], A2:['B1','B2'], A3:['B2','B3'], A4:['B3','S2']
}

const A_BL = ['A1','A2','A3','A4']
const BS_BL = ['B1','B2','B3','S1','S2']
const ORDERED = ['A1','A2','A3','A4','B1','B2','B3','S1','S2']
const EVT_NAMES = ['Teen','Youth']

// Helpers
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const isConsec = (aBlocks: string[]) => {
  if (aBlocks.length <= 1) return true
  const idx = aBlocks.map(b => A_BL.indexOf(b)).sort((a,b)=>a-b)
  return idx.every((v,i) => i===0 || v===idx[i-1]+1)
}

const getAllAPartitions = (n: number): string[][][] => {
  if (n <= 0) return []
  if (n === 1) return [[['A1','A2','A3','A4']]]
  if (n >= 4)  return [[['A1'],['A2'],['A3'],['A4']]]
  const res: string[][][] = []
  if (n === 2) {
    for (let i = 1; i < 4; i++) {
      res.push([A_BL.slice(0,i), A_BL.slice(i)])
    }
  } else { // n === 3
    for (let i = 1; i < 3; i++) {
      for (let j = i+1; j < 4; j++) {
        res.push([A_BL.slice(0,i), A_BL.slice(i,j), A_BL.slice(j)])
      }
    }
  }
  return res
}

const bestPartition = (n: number, weights: Record<string, number>) => {
  const opts = getAllAPartitions(Math.min(n, 4))
  if (!opts.length) return []
  let best = opts[0]
  let bestV = Infinity
  opts.forEach(parts => {
    const wts = parts.map(g => g.reduce((s,b)=>s+(weights[b]||0),0))
    const mean = wts.reduce((s,x)=>s+x,0)/wts.length
    const v = wts.reduce((s,x)=>s+(x-mean)**2,0)
    if (v < bestV) { best = parts; bestV = v }
  })
  return best
}

const autoAssignFn = (counters: Member[], weights: Record<string, number>, prev: Record<string, string[] | string | undefined> = {}) => {
  if (!counters.length) return {}
  const result: Record<string, string[]> = {}
  const loadOf: Record<string, number> = {}
  counters.forEach(c => { loadOf[c.name] = 0 })

  const prevOf: Record<string, string[]> = {}
  Object.entries(prev).forEach(([block, names]) => {
    (Array.isArray(names) ? names : [names]).filter(Boolean)
      .forEach((nm: any) => {
        if (!nm) return
        const key = String(nm)
        prevOf[key] = prevOf[key] || []
        prevOf[key].push(block)
      })
  })

  const myA = (name: string) => A_BL.filter(b => (result[b]||[]).includes(name))
  const cntA = (name: string) => myA(name).length

  const N = counters.length
  const sh = shuffle(counters)

  // Phase 1: Fixed 2-zone assignment
  const ZONES = [['A1','A2'], ['A3','A4']]
  const wZ0 = ZONES[0].reduce((s,b) => s+(weights[b]||0), 0)
  const wZ1 = ZONES[1].reduce((s,b) => s+(weights[b]||0), 0)
  const base = Math.floor(N / 2)
  const zCnt = N % 2 === 0 ? [base, base] : (wZ1 >= wZ0 ? [base, base+1] : [base+1, base])

  const prevZoneOf = (name: string) => {
    const pa = (prevOf[name]||[]).filter(b => A_BL.includes(b))
    if (!pa.length) return -1
    if (ZONES[0].some(b => pa.includes(b))) return 0
    if (ZONES[1].some(b => pa.includes(b))) return 1
    return -1
  }

  const remaining = shuffle([...sh])
  ZONES.forEach((zone, zi) => {
    for (let k = 0; k < zCnt[zi] && remaining.length; k++) {
      // prefer people who were NOT in this zone previously
      remaining.sort((a,b) => (prevZoneOf(a.name)===zi ? 1:0) - (prevZoneOf(b.name)===zi ? 1:0))
      const winner = remaining.shift()!
      result[zone[0]] = [...(result[zone[0]]||[]), winner.name]
      result[zone[1]] = [...(result[zone[1]]||[]), winner.name]
      loadOf[winner.name] += (weights[zone[0]]||0) + (weights[zone[1]]||0)
    }
  })

  // Phase 2: Safety fill
  A_BL.forEach(abl => {
    while ((result[abl]||[]).length < 2) {
      const cands = [...counters]
        .filter(c => !(result[abl]||[]).includes(c.name))
        .filter(c => cntA(c.name) < 2)
        .filter(c => isConsec([...myA(c.name), abl]))
        .sort((a, b) => loadOf[a.name] - loadOf[b.name])
      if (!cands.length) break
      const winner = cands[0]
      result[abl] = [...(result[abl]||[]), winner.name]
      loadOf[winner.name] += weights[abl]||0
    }
  })

  // Phase 3: B/S blocks
  BS_BL.forEach(block => {
    const adj = counters.filter(c => myA(c.name).some(a => ADJ[a]?.includes(block)))
    const pool = adj.length ? adj : counters
    const prevOwners = (Array.isArray(prev[block]) ? prev[block] : [prev[block]]).filter(Boolean) as string[]

    const eligible = pool.filter(c => {
      if (block === 'S1' || block === 'S2') {
        const other = block === 'S1' ? 'S2' : 'S1'
        if ((result[other]||[]).includes(c.name)) return false
      }
      return true
    })
    const finalPool = eligible.length ? eligible : pool

    const sorted = [...finalPool].sort((a,b) => {
      const pa = prevOwners.includes(a.name) ? -1 : 0
      const pb = prevOwners.includes(b.name) ? -1 : 0
      if (pa !== pb) return pa - pb
      const la = loadOf[a.name] || 0
      const lb = loadOf[b.name] || 0
      if (la !== lb) return la - lb
      return Math.random() - 0.5
    })
    const winner = sorted[0]
    if (winner) {
      result[block] = [winner.name]
      loadOf[winner.name] += weights[block]||0
    }
  })

  return result
}

export default function AssignPage(): React.ReactElement {
  const [bulkText, setBulkText] = useState("")
  const [singleName, setSingleName] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [isReady, setIsReady] = useState(false)
  const [activeEvt, setActiveEvt] = useState(0)
  const [mode, setMode] = useState<'view'|'manual'>('view')
  const [selected, setSelected] = useState<Member | null>(null)
  const [showOut, setShowOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [events, setEvents] = useState<EventState[]>([
    { assignments:{}, sr:{ tcIn:null, tcOut:null, fd:null } },
    { assignments:{}, sr:{ tcIn:null, tcOut:null, fd:null } },
  ])

  const eventMembers = useCallback((ei: number) => {
    const label = ei === 0 ? 'teen' : 'youth'
    return members.filter(m => !m.availability || m.availability === 'both' || m.availability === label)
  }, [members])

  const allBlockForEvent = useCallback((ei:number) => eventMembers(ei).slice(0, 2), [eventMembers])
  const poolForEvent = useCallback((ei:number) => eventMembers(ei).slice(2), [eventMembers])

  const getSRNames = useCallback((ei:number) => {
    const { tcIn, tcOut, fd } = events[ei].sr
    return [tcIn,tcOut,fd].filter(Boolean) as string[]
  }, [events])

  const getCounters = useCallback((ei:number) => {
    const sr = getSRNames(ei)
    return poolForEvent(ei).filter(m => !sr.includes(m.name))
  }, [poolForEvent, getSRNames])

  const getAssignees = useCallback((block:string, ei=activeEvt) => events[ei].assignments[block] || [], [events, activeEvt])

  const aStatus = useMemo(() => A_BL.map(bl => ({ bl, cnt: (events[activeEvt].assignments[bl]||[]).length })), [events, activeEvt])
  const allAMet = useMemo(() => aStatus.every(s => s.cnt >= 2), [aStatus])

  const getMemberBlocks = useCallback((name:string, ei=activeEvt) => ORDERED.filter(b => (events[ei].assignments[b]||[]).includes(name)), [events, activeEvt])

  const getMemberRole = useCallback((name:string, ei=activeEvt) => {
    if (allBlockForEvent(ei).find(m=>m.name===name)) return 'ALL BLOCK'
    const { tcIn, tcOut, fd } = events[ei].sr
    if (tcIn===name) return 'TC IN'
    if (tcOut===name) return 'TC OUT'
    if (fd===name) return 'FD'
    return null
  }, [allBlockForEvent, events])

  const colorOf = useCallback((name:string) => members.find(m=>m.name===name)?.color ?? '#334155', [members])

  const parseMemberStr = (raw: string): { name: string; availability: Availability } => {
    const tOnly = /\(T\)\s*$/i.test(raw)
    const yOnly = /\(Y\)\s*$/i.test(raw)
    const n0 = raw.replace(/\s*\([TY]\)\s*$/i,'').trim()
    const availability: Availability = tOnly ? 'teen' : yOnly ? 'youth' : 'both'
    return { name: n0.charAt(0).toUpperCase()+n0.slice(1), availability }
  }

  const parseBulk = () => {
    const lines = bulkText.split('\n').map(l=>l.replace(/^[\s*•\-\d.]+/,'').trim()).filter(Boolean)
    if (!lines.length) return setError('No names to import')
    setMembers(prev => {
      const added = lines.map((raw, i) => {
        const { name, availability } = parseMemberStr(raw)
        return { id: Date.now() + i, name, color: COLORS[(prev.length + i) % COLORS.length], availability }
      })
      return [...prev, ...added]
    })
    setBulkText(''); setIsReady(false); setShowImport(false); setError('');
  }

  const addSingle = () => {
    const raw = singleName.trim()
    if (!raw) return
    const { name, availability } = parseMemberStr(raw)
    setMembers(prev=>[...prev,{ id:Date.now(), name, color:COLORS[prev.length%COLORS.length], availability }])
    setSingleName(''); setIsReady(false)
  }

  const removeMember = (id:number) => { setMembers(prev=>prev.filter(m=>m.id!==id)); setIsReady(false); setError('') }

  const moveMember = (id:number, dir:number) => {
    setMembers(prev=>{
      const idx = prev.findIndex(p=>p.id===id)
      if (idx === -1) return prev
      const copy = [...prev]
      const to = idx + dir
      if (to < 0 || to >= prev.length) return prev
      const [item] = copy.splice(idx,1)
      copy.splice(to,0,item)
      return copy
    })
    setIsReady(false)
  }

  const initialize = () => {
    if (members.length < 5) return setError('Tambahkan minimal 5 anggota')
    const teenN = eventMembers(0).length
    const youthN = eventMembers(1).length
    if (teenN < 5) return setError('Terlalu sedikit untuk Teen')
    if (youthN < 5) return setError('Terlalu sedikit untuk Youth')
    setError('')

    const teenPool = shuffle(poolForEvent(0))
    const sr1 = teenPool.slice(0,3)
    const sr1Names = new Set(sr1.map(m=>m.name))

    const youthBase = poolForEvent(1)
    const youthEligible = youthBase.filter(m => !sr1Names.has(m.name))
    const youthPool = shuffle(youthEligible)
    let sr2: Member[]
    if (youthPool.length >= 3) sr2 = youthPool.slice(0,3)
    else {
      const rest = poolForEvent(1).filter(m=>!youthPool.includes(m))
      sr2 = [...youthPool, ...rest].slice(0,3)
    }

    setEvents([
      { assignments:{}, sr:{ tcIn:sr1[0]?.name ?? null, tcOut:sr1[1]?.name ?? null, fd:sr1[2]?.name ?? null } },
      { assignments:{}, sr:{ tcIn:sr2[0]?.name ?? null, tcOut:sr2[1]?.name ?? null, fd:sr2[2]?.name ?? null } },
    ])
    setIsReady(true); setMode('view'); setSelected(null)
  }

  const runAuto = () => {
    if (!isReady) return setError('Initialize dulu')
    const a0 = autoAssignFn(getCounters(0), WEIGHTS[0], {})
    const a1 = autoAssignFn(getCounters(1), WEIGHTS[1], a0)
    setEvents(prev=>[{ ...prev[0], assignments:a0 },{ ...prev[1], assignments:a1 }])
    setError('')
  }

  const clearAll = () => setEvents(prev=>prev.map(e=>({ ...e, assignments:{} })))

  const setEventSR = (ei:number, role: 'tcIn'|'tcOut'|'fd', name?: string|null) => {
    setEvents(prev => prev.map((e, i) => i !== ei ? e : { ...e, sr: { ...e.sr, [role]: name || null } }))
  }

  const getSREligible = (ei:number, excludeRole?: string) => {
    const sr = events[ei].sr
    const taken = Object.entries(sr).filter(([k]) => k !== excludeRole).map(([,v]) => v).filter(Boolean)
    return poolForEvent(ei).filter(m => !taken.includes(m.name))
  }

  const handleBlockClick = (block:string) => {
    if (mode!=='manual' || !selected || !isReady) return
    if (getMemberRole(selected.name, activeEvt)) return setError('Member sudah punya role')
    setError('')

    const cur = getAssignees(block, activeEvt)
    const has = cur.includes(selected.name)
    let next: string[] = []
    if (has) next = cur.filter(n => n !== selected.name)
    else {
      next = [...cur, selected.name]
      if (next.length > 2 && A_BL.includes(block)) next = next.slice(0,2)
    }

    const newA = { ...events[activeEvt].assignments }
    if (next.length) newA[block] = next
    else delete newA[block]
    setEvents(prev=>prev.map((e,i)=>i===activeEvt?{ ...e, assignments:newA }:e))
  }

  const genOutput = () => events.map((evt, ei) => {
    const lines: string[] = [EVT_NAMES[ei], '']
    allBlockForEvent(ei).forEach(m => lines.push(`• ${m.name} : ALL BLOCK`))
    const { tcIn, tcOut, fd } = evt.sr
    if (tcIn) lines.push(`• TC IN : ${tcIn}`)
    if (tcOut) lines.push(`• TC OUT : ${tcOut}`)
    if (fd) lines.push(`• FD : ${fd}`)
    getCounters(ei).forEach(c => {
      const bl = getMemberBlocks(c.name, ei).join(', ') || '—'
      lines.push(`• ${c.name} : ${bl}`)
    })
    return lines.join('\n')
  }).join('\n\n')

  const copyOut = async () => {
    try {
      await navigator.clipboard.writeText(genOutput())
      setCopied(true)
      setTimeout(()=>setCopied(false), 1600)
    } catch {}
  }

  return (
    <div style={{maxWidth:780}}>
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-foreground leading-[1.1]">Assign</h1>
        <p className="mt-3 text-muted-foreground text-base max-w-md leading-relaxed">Tool assignment telah dikonversi ke TypeScript/React. UI asli (SVG map dan interaksi) dipertahankan secara fungsional.</p>
      </div>

      <div style={{display:'flex',gap:12}}>
        <div style={{flex:1, maxWidth:320}}>
          <div style={{padding:12, borderBottom:'1px solid rgba(10,25,41,0.6)'}}>
            <div style={{display:'flex',gap:6,marginBottom:8}}>
              <input value={singleName} onChange={e=>setSingleName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSingle()} placeholder="Nama... (T) atau (Y) opsional" className="bg-card border-border/70 rounded-md w-full p-2 text-foreground" />
              <button onClick={addSingle} className="bg-primary text-white rounded-md px-3">+</button>
            </div>
            <button onClick={()=>setShowImport(p=>!p)} className="text-sm text-muted-foreground">{showImport? '▼':'▶'} IMPORT DARI TEKS</button>
            {showImport && (
              <div style={{marginTop:8}}>
                <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={5} className="bg-card border-border/70 rounded-md p-2 w-full text-foreground" placeholder="• rafa\n• medelin (T)\n• chen (Y)" />
                <button onClick={parseBulk} className="mt-2 w-full bg-muted text-muted-foreground rounded-md p-2">IMPORT ({bulkText.split('\n').filter(l=>l.trim()).length} NAMA)</button>
              </div>
            )}
          </div>

          <div style={{padding:8, maxHeight:420, overflowY:'auto'}}>
            {members.length===0 ? (
              <div className="text-muted-foreground p-6 text-center">BELUM ADA ANGGOTA</div>
            ) : (
              <>
                <div className="text-muted-foreground text-sm mb-2">{members.length} ANGGOTA · 2 TERATAS = KOORDINATOR ALL BLOCK</div>
                {members.map((m,i)=> (
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:6,border:'1px solid rgba(15,42,74,0.4)',borderRadius:8,marginBottom:8}}>
                    <div style={{width:28,height:28,background:m.color||'#334155',borderRadius:6}} />
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700}}>{m.name}</div>
                      <div className="text-muted-foreground text-xs">{m.availability}</div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>moveMember(m.id,-1)} className="text-xs">↑</button>
                      <button onClick={()=>moveMember(m.id,1)} className="text-xs">↓</button>
                      <button onClick={()=>removeMember(m.id)} className="text-xs text-destructive">✕</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{padding:10,borderTop:'1px solid rgba(10,25,41,0.6)'}}>
            {error && <div className="text-destructive text-sm mb-2">⚠ {error}</div>}
            {!isReady ? (
              <button onClick={initialize} className="w-full bg-primary text-white rounded-md p-2">🚀 INITIALIZE EVENTS</button>
            ) : (
              <div style={{display:'flex',gap:6}}>
                <button onClick={initialize} className="flex-1 bg-card border-border/70 rounded-md p-2">🎲 RE-ROLL SR</button>
                <button onClick={clearAll} className="flex-1 bg-card border-border/70 rounded-md p-2">🗑 CLEAR</button>
              </div>
            )}
          </div>
        </div>

        <div style={{flex:1}}>
          <div style={{height:420,background:'#030810',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="text-muted-foreground">Visual map & interactions dipindahkan ke komponen terpisah jika diperlukan.</div>
          </div>

          {showOut && isReady && (
            <div style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div className="text-sm text-muted-foreground">OUTPUT TEKS</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={copyOut} className={`rounded-md p-2 ${copied ? 'bg-success text-white' : 'bg-card'}`}>{copied ? '✓ DISALIN' : 'SALIN'}</button>
                </div>
              </div>
              <pre className="mt-2 bg-card p-4 rounded-md text-sm whitespace-pre-wrap">{genOutput()}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

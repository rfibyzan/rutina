export interface DaySrc {
  id: string;
  kind: "event" | "task" | "taskGroup";
  startMin: number;
  endMin: number;
  minH: number;
  taskIds?: string[];
}

export interface Placed {
  id: string;
  kind: "event" | "task" | "taskGroup";
  top: number;
  height: number;
  bottom: number;
  col: number;
  colCount: number;
  cluster: number;
  taskIds?: string[];
}

export function layoutDay(items: DaySrc[], hourHeight: number, gridH: number): { placed: Placed[]; clusters: Placed[][] } {
  const norm = items.map((it) => {
    // Top tepat di garis jamnya: menit mulai * hourHeight/60, tanpa offset.
    const top = (it.startMin / 60) * hourHeight;
    const durH = ((it.endMin - it.startMin) / 60) * hourHeight;
    let height = Math.max(it.minH, durH);
    if (height > gridH) height = gridH;
    // Top tepat di garis jam; hanya item yang melewati batas bawah grid (mis. tenggat 23:59) digeser naik agar tetap terlihat.
    let t = top;
    if (t < 0) t = 0;
    if (t + height > gridH) t = Math.max(0, gridH - height);
    return { ...it, top: t, height, bottom: t + height };
  });
  norm.sort((a, b) => (a.top - b.top) || (a.startMin - b.startMin));

  type Norm = (DaySrc & { top: number; height: number; bottom: number });
  const clusters: Norm[][] = [];
  let cur: Norm[] = [];
  let curEnd = -Infinity;
  for (const it of norm) {
    if (cur.length === 0 || it.top < curEnd) {
      cur.push(it);
      if (it.bottom > curEnd) curEnd = it.bottom;
    } else {
      clusters.push(cur);
      cur = [it];
      curEnd = it.bottom;
    }
  }
  if (cur.length > 0) clusters.push(cur);

  const placed: Placed[] = [];
  const outClusters: Placed[][] = [];
  clusters.forEach((cl, ci) => {
    const colEnds: number[] = [];
    const local: Placed[] = [];
    for (const it of cl) {
      let c = colEnds.findIndex((e) => it.top >= e);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(it.bottom);
      } else {
        colEnds[c] = it.bottom;
      }
      const p: Placed = { id: it.id, kind: it.kind, top: it.top, height: it.height, bottom: it.bottom, col: c, colCount: 0, cluster: ci, taskIds: it.taskIds };
      local.push(p);
      placed.push(p);
    }
    const n = Math.max(1, colEnds.length);
    for (const p of local) p.colCount = n;
    outClusters.push(local);
  });
  return { placed, clusters: outClusters };
}

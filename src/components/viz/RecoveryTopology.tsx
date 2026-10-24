import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useReducedMotion } from 'motion/react';
import type { topology } from '@/lib/operations';

type Node = ReturnType<typeof topology>[number];
type Props = { nodes: Node[]; selected: string; onSelect: (id: string) => void; paused: boolean };
const COLOR = { clean: '#91b4c2', affected: '#ff7585', unresolved: '#efbf70', verified: '#6fe2c1' };
const POSITIONS: Record<string, [number, number, number]> = {
  'supplier-pdf': [-3.8, 0, -.4], 'procurement-summary': [-1.5, .7, -.1],
  'finance-memory': [.8, .45, -.25], 'pending-payment': [3.3, .7, -.1],
  'trusted-records': [-3.4, -.7, 2.4], 'independent-order': [.1, -1, 2.4],
  'summary-rebuilt': [-1.3, 1.25, -2.2], 'memory-rebuilt': [1, 1.25, -2.2], 'payment-rebuilt': [3.4, 1.25, -2.2],
};
const LABELS: Record<string, string> = {
  'supplier-pdf': 'Supplier PDF', 'procurement-summary': 'Procurement summary', 'finance-memory': 'Finance memory',
  'pending-payment': 'Pending payment', 'trusted-records': 'Trusted registry', 'independent-order': 'Independent order',
  'summary-rebuilt': 'Rebuilt summary', 'memory-rebuilt': 'Rebuilt memory', 'payment-rebuilt': 'Verified payment',
};

function NodeLabel({ node, onSelect }: { node: Node; onSelect: (id: string) => void }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 140;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0c171eea'; ctx.beginPath(); ctx.roundRect(2, 2, 508, 136, 14); ctx.fill();
    ctx.strokeStyle = '#284147'; ctx.stroke(); ctx.textAlign = 'center';
    ctx.font = '500 40px Arial'; ctx.fillStyle = '#e2eeeb'; ctx.fillText(LABELS[node.id] ?? node.id, 256, 57, 480);
    ctx.font = '28px monospace'; ctx.fillStyle = COLOR[node.status]; ctx.fillText(`${node.status.toUpperCase()} · V${node.version}`, 256, 108);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [node.id, node.status, node.version]);
  useEffect(() => () => texture.dispose(), [texture]);
  const above = node.id === 'supplier-pdf' || node.id === 'finance-memory' || node.id.endsWith('rebuilt');
  return <sprite position={[0, above ? .65 : -.6, 0]} scale={[2.9, .79, 1]} renderOrder={10} onClick={event => { event.stopPropagation(); onSelect(node.id); }}><spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} /></sprite>;
}

class GraphBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function FlatTopology({ nodes, selected, onSelect }: Props) {
  return <div className="op-flat-topology" aria-label="Dependency map in list view">{nodes.map(node => <button key={node.id} onClick={() => onSelect(node.id)} aria-pressed={selected === node.id}>
    <span style={{ background: COLOR[node.status] }} /><strong>{LABELS[node.id] ?? node.id}</strong><small>{node.status}</small>
    <em>{node.parents.length ? `From ${node.parents.map(p => LABELS[p] ?? p).join(' + ')}` : 'Source record'}</em>
  </button>)}</div>;
}

export default function RecoveryTopology(props: Props) {
  const { nodes, selected, onSelect, paused } = props;
  const reduce = useReducedMotion();
  const [flat, setFlat] = useState(false);
  const fallback = <FlatTopology {...props} />;
  return <div className="op-topology-wrap">
    <button className="op-map-switch" onClick={() => setFlat(!flat)}>{flat ? '3D topology' : 'Accessible list'}</button>
    {flat ? fallback : <GraphBoundary fallback={fallback}><Suspense fallback={<div className="op-graph-loading">Loading dependency topology…</div>}>
      <Canvas fallback={fallback} camera={{ position: [1, 6.2, 10.7], fov: 45 }} dpr={[1, 1.5]} frameloop={reduce || paused ? 'demand' : 'always'} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => setFlat(true), { once: true })}>
        <ambientLight intensity={1.5} /><directionalLight position={[3, 5, 4]} intensity={3} />
        <gridHelper args={[24, 30, '#243c41', '#14242c']} position={[0, -1.7, 0]} />
        {nodes.flatMap(node => node.parents.filter(parent => POSITIONS[parent]).map(parent => {
          const a = POSITIONS[parent]; const b = POSITIONS[node.id];
          if (!b) return null;
          const color = COLOR[node.status];
          return <Line key={`${parent}-${node.id}`} points={[a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .45, (a[2] + b[2]) / 2], b]} color={color} transparent opacity={node.status === 'clean' ? .45 : .85} lineWidth={node.status === 'clean' ? 1 : 2} dashed={node.status === 'affected'} dashSize={.16} gapSize={.1} />;
        }))}
        {nodes.map(node => <group key={node.id} position={POSITIONS[node.id] ?? [0, 0, 0]}>
          <mesh onClick={event => { event.stopPropagation(); onSelect(node.id); }}>
            <icosahedronGeometry args={[selected === node.id ? .28 : .21, 1]} />
            <meshStandardMaterial color={COLOR[node.status]} emissive={COLOR[node.status]} emissiveIntensity={.5} metalness={.5} roughness={.25} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[selected === node.id ? .43 : .32, .012, 6, 40]} /><meshBasicMaterial color={COLOR[node.status]} transparent opacity={.7} /></mesh>
          <NodeLabel node={node} onSelect={onSelect} />
        </group>)}
        <OrbitControls makeDefault target={[0, 0, .3]} enablePan={false} enableZoom minDistance={7} maxDistance={18} minPolarAngle={.35} maxPolarAngle={Math.PI / 2.15} autoRotate={!reduce && !paused} autoRotateSpeed={.35} />
      </Canvas>
    </Suspense></GraphBoundary>}
    {!flat && <p className="op-map-hint">Drag to orbit · scroll to zoom · select a node to inspect</p>}
  </div>;
}

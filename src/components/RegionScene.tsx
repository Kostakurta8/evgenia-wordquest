/**
 * Hand-built layered SVG scenery for every region — painterly-ish, IP-safe,
 * zero image downloads. One <RegionScene slug=… /> renders a 320×110 scene
 * (use inside an overflow-hidden container; it scales to fill).
 */

type Sky = [string, string];

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** deterministic pseudo-random in [0,1) — stable across renders */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Stars({ n = 18, seed = 1, dim = false }: { n?: number; seed?: number; dim?: boolean }) {
  return (
    <g>
      {range(n).map((i) => (
        <circle
          key={i}
          cx={rnd(seed + i) * 320}
          cy={rnd(seed + i + 50) * 55}
          r={rnd(seed + i + 99) * 1.1 + 0.4}
          fill="#FFF7D6"
          opacity={dim ? 0.5 : 0.85}
        />
      ))}
    </g>
  );
}

function Sun({ x = 258, y = 28, r = 13, color = "#FFD86B" }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.2} fill={color} opacity="0.22" />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
}

function Moon({ x = 262, y = 24, r = 10 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2} fill="#EAF2FF" opacity="0.15" />
      <circle cx={x} cy={y} r={r} fill="#F2F6FF" />
      <circle cx={x - 4} cy={y - 2} r={r * 0.85} fill="#0000" />
      <circle cx={x + 3.5} cy={y - 2.5} r={2} fill="#D9E2F5" opacity="0.7" />
    </g>
  );
}

function Hills({ y = 70, amp = 12, fill = "#9CC069", seed = 3 }) {
  const pts = range(9).map((i) => `${(i * 320) / 8},${y + Math.sin(i * 1.7 + seed) * amp}`);
  return <path d={`M0,110 L0,${y} L${pts.join(" L")} L320,${y} L320,110 Z`} fill={fill} />;
}

function Pines({ y = 78, n = 11, h = 26, fill = "#2E5B3F", seed = 7 }) {
  return (
    <g fill={fill}>
      {range(n).map((i) => {
        const x = 8 + i * (304 / (n - 1)) + (rnd(seed + i) - 0.5) * 14;
        const hh = h * (0.7 + rnd(seed + i + 9) * 0.6);
        return <path key={i} d={`M${x},${y} L${x - 7},${y} L${x},${y - hh} L${x + 7},${y} Z`} />;
      })}
    </g>
  );
}

function RoundTrees({ y = 80, n = 7, fill = "#5E8C4A", seed = 4 }) {
  return (
    <g fill={fill}>
      {range(n).map((i) => {
        const x = 14 + i * (292 / (n - 1)) + (rnd(seed + i) - 0.5) * 18;
        const r = 7 + rnd(seed + i + 31) * 7;
        return (
          <g key={i}>
            <rect x={x - 1.4} y={y - 4} width={2.8} height={7} fill="#6B4A2E" />
            <circle cx={x} cy={y - r + 1} r={r} />
          </g>
        );
      })}
    </g>
  );
}

function RoundDoor({ x, y, r = 7, door = "#C9A227" }: { x: number; y: number; r?: number; door?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 2.2} fill="#7A5C39" />
      <circle cx={x} cy={y} r={r} fill={door} />
      <circle cx={x + r * 0.45} cy={y} r={1} fill="#3A2E1B" />
    </g>
  );
}

function Window({ x, y, w = 5, h = 6 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={1.2} fill="#FFD86B" opacity="0.95" />;
}

function Fog({ y = 60, opacity = 0.5 }) {
  return (
    <g fill="#E8EAEE" opacity={opacity}>
      <ellipse cx="70" cy={y} rx="95" ry="13" />
      <ellipse cx="210" cy={y + 10} rx="120" ry="15" />
      <ellipse cx="300" cy={y - 4} rx="80" ry="11" />
    </g>
  );
}

function River({ y = 86, fill = "#7FB4D9" }) {
  return (
    <g>
      <path d={`M0,110 L0,${y} Q80,${y - 7} 160,${y} T320,${y} L320,110 Z`} fill={fill} />
      <path
        d={`M10,${y + 7} q22,-4 44,0 M120,${y + 10} q26,-5 52,0 M230,${y + 6} q20,-4 40,0`}
        stroke="#fff"
        strokeWidth="1.4"
        fill="none"
        opacity="0.65"
        strokeLinecap="round"
      />
    </g>
  );
}

function Fire({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-3" r="11" fill="#FF9D3D" opacity="0.25" />
      <path d="M0,-12 C4,-7 5,-4 3,0 C6,-2 6,1 4,3 L-4,3 C-6,1 -6,-2 -3,0 C-5,-4 -4,-7 0,-12Z" fill="#FF9D3D" />
      <path d="M0,-7 C2,-4 2.6,-2 1.4,0.6 L-1.4,0.6 C-2.6,-2 -2,-4 0,-7Z" fill="#FFE08A" />
    </g>
  );
}

function Tower({ x = 248, y = 86, h = 42, ruined = true }) {
  return (
    <g fill="#5B5566">
      <rect x={x - 11} y={y - h} width={22} height={h} rx={2} />
      {ruined ? (
        <path d={`M${x - 11},${y - h} l5,-6 5,4 4,-7 4,5 4,-3 v7 Z`} />
      ) : (
        <rect x={x - 14} y={y - h - 5} width={28} height={6} rx={1.5} />
      )}
      <rect x={x - 2.5} y={y - h + 12} width={5} height={7} rx={1} fill="#241F2E" />
    </g>
  );
}

function Mountains({ y = 84, fill = "#7C8794", snow = true }) {
  const peaks = [
    [0, 30, 70],
    [55, 46, 130],
    [120, 36, 200],
    [185, 50, 268],
    [240, 34, 320],
  ];
  return (
    <g>
      {peaks.map(([a, h, b], i) => (
        <g key={i}>
          <path d={`M${a},${y} L${(a + b) / 2},${y - h} L${b},${y} Z`} fill={fill} />
          {snow && (
            <path
              d={`M${(a + b) / 2 - 8},${y - h + 12} L${(a + b) / 2},${y - h} L${(a + b) / 2 + 8},${y - h + 12} L${(a + b) / 2 + 3},${y - h + 9} L${(a + b) / 2},${y - h + 13} L${(a + b) / 2 - 3},${y - h + 9} Z`}
              fill="#F4F7FB"
            />
          )}
        </g>
      ))}
    </g>
  );
}

function GoldCanopy() {
  return (
    <g>
      {range(9).map((i) => {
        const x = 12 + i * 37 + (rnd(i + 2) - 0.5) * 16;
        const y = 78 - rnd(i + 60) * 8;
        const r = 13 + rnd(i + 21) * 9;
        return (
          <g key={i}>
            <rect x={x - 1.7} y={y} width={3.4} height={110 - y} fill="#C9CFD8" />
            <circle cx={x} cy={y - r * 0.55} r={r} fill={i % 2 ? "#E8B83A" : "#F0C95C"} />
          </g>
        );
      })}
    </g>
  );
}

function Pillars() {
  return (
    <g fill="#3A3344">
      {range(7).map((i) => {
        const x = 18 + i * 47;
        return <rect key={i} x={x} y={8} width={11} height={102} rx={2} opacity={0.55 + (i % 3) * 0.15} />;
      })}
    </g>
  );
}

function Fireworks({ seed = 5, n = 3 }) {
  return (
    <g>
      {range(n).map((i) => {
        const cx = 50 + rnd(seed + i) * 220;
        const cy = 18 + rnd(seed + i + 40) * 22;
        const col = ["#FFD34D", "#F07292", "#7FD9C0"][i % 3];
        return (
          <g key={i} stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity="0.9">
            {range(8).map((k) => {
              const a = (k / 8) * Math.PI * 2;
              return (
                <line
                  key={k}
                  x1={cx + Math.cos(a) * 3}
                  y1={cy + Math.sin(a) * 3}
                  x2={cx + Math.cos(a) * 11}
                  y2={cy + Math.sin(a) * 11}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

interface SceneDef {
  sky: Sky;
  body: React.ReactNode;
}

function defs(slug: string): SceneDef {
  switch (slug) {
    case "prologue":
      return {
        sky: ["#BFE3F2", "#F5EEC9"],
        body: (
          <>
            <Sun />
            <Hills y={62} amp={9} fill="#A9C97A" seed={2} />
            <Hills y={78} amp={7} fill="#8FB75E" seed={8} />
            <RoundDoor x={60} y={88} door="#C9A227" />
            <RoundDoor x={150} y={94} r={6} door="#2E7DD1" />
            <RoundDoor x={246} y={90} r={6.5} door="#C0392B" />
            <RoundTrees y={70} n={4} seed={11} />
          </>
        ),
      };
    case "long-expected-party":
      return {
        sky: ["#1B2A52", "#3D3A6B"],
        body: (
          <>
            <Stars n={14} seed={9} dim />
            <Fireworks />
            <Hills y={80} amp={8} fill="#27484F" seed={4} />
            <RoundDoor x={282} y={92} r={6} />
            <g>
              <rect x={40} y={88} width={150} height={3} rx={1.5} fill="#6B4A2E" />
              {range(6).map((i) => (
                <circle key={i} cx={52 + i * 26} cy={84} r={2.6} fill={["#FFD34D", "#F07292", "#7FD9C0"][i % 3]} />
              ))}
            </g>
          </>
        ),
      };
    case "shadow-of-the-past":
      return {
        sky: ["#241D18", "#4A372A"],
        body: (
          <>
            <rect x="0" y="74" width="320" height="36" fill="#1D1612" />
            <Window x={60} y={52} w={16} h={20} />
            <g>
              <circle cx={208} cy={84} r={9} fill="none" stroke="#E8B83A" strokeWidth="3" />
              <circle cx={208} cy={84} r={13} fill="#FF9D3D" opacity="0.18" />
            </g>
            <Fire x={250} y={92} s={1.2} />
          </>
        ),
      };
    case "three-is-company":
      return {
        sky: ["#16264F", "#41577E"],
        body: (
          <>
            <Stars n={20} seed={3} />
            <Moon />
            <Hills y={72} amp={10} fill="#22473B" seed={5} />
            <path d="M-5,110 C70,86 120,98 165,84 C210,72 260,84 325,68" stroke="#D9C9A6" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85" />
            <RoundTrees y={70} n={5} fill="#1C3A2F" seed={14} />
          </>
        ),
      };
    case "short-cut-to-mushrooms":
      return {
        sky: ["#CFE6D8", "#F2EFC9"],
        body: (
          <>
            <Sun x={48} y={26} color="#FFE9A3" />
            <Fog y={52} opacity={0.5} />
            <Hills y={70} amp={6} fill="#9CBF6B" seed={6} />
            <g>
              {[70, 150, 235].map((x, i) => (
                <g key={i}>
                  <rect x={x - 2.4} y={90} width={4.8} height={9} rx={2} fill="#EFE3C8" />
                  <path d={`M${x - 11},92 A11,9 0 0 1 ${x + 11},92 Z`} fill={i === 1 ? "#C0392B" : "#B5651D"} />
                  <circle cx={x - 4} cy={87} r={1.5} fill="#FFF3DC" />
                  <circle cx={x + 4.5} cy={88.5} r={1.2} fill="#FFF3DC" />
                </g>
              ))}
            </g>
          </>
        ),
      };
    case "conspiracy-unmasked":
      return {
        sky: ["#23203F", "#494372"],
        body: (
          <>
            <Stars n={12} seed={17} dim />
            <Hills y={78} amp={7} fill="#2C2A4A" seed={9} />
            <g>
              <rect x={118} y={62} width={84} height={34} rx={5} fill="#54381F" />
              <path d="M112,64 L160,42 L208,64 Z" fill="#3B2614" />
              <Window x={132} y={72} />
              <Window x={156} y={72} />
              <Window x={180} y={72} />
            </g>
          </>
        ),
      };
    case "old-forest":
      return {
        sky: ["#27331E", "#4E5C33"],
        body: (
          <>
            <g opacity="0.9">
              {range(6).map((i) => {
                const x = 22 + i * 56;
                return (
                  <g key={i} fill="#1E2A16">
                    <path d={`M${x},110 C${x - 5},80 ${x - 12},70 ${x - 4},48 C${x + 1},38 ${x + 7},40 ${x + 6},52 C${x + 14},66 ${x + 6},82 ${x + 9},110 Z`} />
                    <circle cx={x} cy={42} r={15} fill="#33491F" />
                  </g>
                );
              })}
            </g>
            <path d="M0,40 L320,40" stroke="#A4C463" strokeWidth="22" opacity="0.18" />
            <path d="M60,8 L78,110" stroke="#E9F2C8" strokeWidth="9" opacity="0.16" />
            <path d="M210,4 L196,110" stroke="#E9F2C8" strokeWidth="12" opacity="0.13" />
          </>
        ),
      };
    case "house-of-tom-bombadil":
      return {
        sky: ["#9FD2E8", "#E7F2C8"],
        body: (
          <>
            <Sun x={50} y={22} />
            <Hills y={66} amp={8} fill="#92BC68" seed={12} />
            <River y={92} />
            <g>
              <rect x={196} y={56} width={62} height={28} rx={4} fill="#EFE3C8" />
              <path d="M190,58 L227,38 L264,58 Z" fill="#C0903D" />
              <Window x={208} y={64} />
              <Window x={234} y={64} />
            </g>
            <g fill="#F2F7E6">
              {[60, 96, 132].map((x, i) => (
                <ellipse key={i} cx={x} cy={94 + (i % 2) * 3} rx={6} ry={2.4} />
              ))}
            </g>
          </>
        ),
      };
    case "fog-on-the-barrow-downs":
      return {
        sky: ["#9AA3B2", "#C9CFD8"],
        body: (
          <>
            <circle cx={262} cy={24} r={9} fill="#E9EDF4" opacity="0.85" />
            <Hills y={68} amp={9} fill="#7E8A7C" seed={13} />
            <g fill="#5E6B70">
              {[70, 110, 150, 226].map((x, i) => (
                <rect key={i} x={x} y={58 - (i % 2) * 6} width={9} height={28 + (i % 2) * 8} rx={3} transform={`rotate(${(rnd(i) - 0.5) * 10} ${x} 70)`} />
              ))}
            </g>
            <Fog y={78} opacity={0.75} />
            <Fog y={56} opacity={0.45} />
          </>
        ),
      };
    case "prancing-pony":
      return {
        sky: ["#1E2433", "#3A4256"],
        body: (
          <>
            <Stars n={8} seed={23} dim />
            <rect x="0" y="84" width="320" height="26" fill="#23202B" />
            <g>
              <rect x={86} y={44} width={120} height={48} rx={4} fill="#4A3623" />
              <path d="M80,46 L146,24 L212,46 Z" fill="#332416" />
              <Window x={100} y={58} w={10} h={12} />
              <Window x={128} y={58} w={10} h={12} />
              <Window x={172} y={58} w={10} h={12} />
              <rect x={146} y={70} width={14} height={22} rx={2} fill="#2A1D10" />
              <g>
                <rect x={224} y={48} width={2.5} height={22} fill="#8A8A8A" />
                <rect x={212} y={44} width={27} height={17} rx={2.5} fill="#EFE3C8" />
                <path d="M219,57 q3,-9 8,-7 q-1,-4 3,-4 q5,0 4,6 q4,1 2,5 Z" fill="#6B4A2E" />
              </g>
            </g>
            <circle cx={262} cy={86} r={4} fill="#FFD86B" opacity="0.9" />
            <circle cx={262} cy={86} r={8} fill="#FFD86B" opacity="0.25" />
          </>
        ),
      };
    case "strider":
      return {
        sky: ["#1C1A26", "#37314A"],
        body: (
          <>
            <Stars n={10} seed={31} dim />
            <rect x="0" y="80" width="320" height="30" fill="#15131D" />
            <Fire x={150} y={92} s={1.5} />
            <g fill="#2A2536">
              <path d="M216,92 L216,58 Q224,46 232,58 L232,92 Z" />
              <circle cx={224} cy={52} r={7} />
              <path d="M212,60 L240,60 L236,50 L216,50 Z" fill="#1E1A29" />
            </g>
            <g stroke="#5E5670" strokeWidth="2" strokeLinecap="round">
              <line x1={60} y1={92} x2={74} y2={64} />
              <line x1={74} y1={64} x2={88} y2={92} />
            </g>
          </>
        ),
      };
    case "knife-in-the-dark":
      return {
        sky: ["#10131F", "#272B45"],
        body: (
          <>
            <Stars n={24} seed={41} />
            <Hills y={76} amp={10} fill="#1B1F33" seed={15} />
            <Tower />
            <Fire x={236} y={92} s={1.1} />
            <g fill="#06070D">
              {[40, 66, 92].map((x, i) => (
                <path key={i} d={`M${x},96 q4,-18 10,-20 q2,8 8,9 q-4,4 -3,11 Z`} opacity={0.9 - i * 0.12} />
              ))}
            </g>
          </>
        ),
      };
    case "flight-to-the-ford":
      return {
        sky: ["#9FB8D8", "#E5D9BE"],
        body: (
          <>
            <Mountains y={70} fill="#8E9BAB" />
            <RoundTrees y={72} n={4} fill="#B5651D" seed={19} />
            <River y={80} fill="#5E97C4" />
            <g fill="#fff" opacity="0.9">
              {[60, 120, 180, 240].map((x, i) => (
                <path key={i} d={`M${x},${84 + (i % 2) * 4} q6,-9 14,-6 q8,2 6,8 q-12,4 -20,-2Z`} />
              ))}
            </g>
          </>
        ),
      };
    case "many-meetings":
      return {
        sky: ["#C9DBEC", "#F3E3C2"],
        body: (
          <>
            <Sun x={272} y={22} color="#FFE9A3" />
            <Mountains y={66} fill="#9FA8B8" snow={false} />
            <path d="M0,66 L60,110 M320,66 L250,110" stroke="#7C8794" strokeWidth="14" opacity="0.5" />
            <path d="M152,30 L152,72 M166,34 L166,72" stroke="#DFE9F2" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
            <path d="M96,78 Q160,58 224,78" stroke="#C9A227" strokeWidth="3.5" fill="none" />
            <RoundTrees y={92} n={5} fill="#B5651D" seed={25} />
          </>
        ),
      };
    case "council-of-elrond":
      return {
        sky: ["#BFD6E8", "#F0E2C4"],
        body: (
          <>
            <Sun x={50} y={24} />
            <Fog y={48} opacity={0.35} />
            <rect x="36" y="78" width="248" height="8" rx="4" fill="#C9B795" />
            <g fill="#8A744E">
              {range(9).map((i) => (
                <rect key={i} x={52 + i * 26} y={66} width={6} height={13} rx={2} />
              ))}
            </g>
            <circle cx={160} cy={70} r={5} fill="#E8B83A" />
            <circle cx={160} cy={70} r={8.5} fill="#E8B83A" opacity="0.25" />
            <RoundTrees y={62} n={3} fill="#C0903D" seed={29} />
          </>
        ),
      };
    case "ring-goes-south":
      return {
        sky: ["#7E9BC2", "#D8E4F2"],
        body: (
          <>
            <Mountains y={88} fill="#6E7B8E" />
            <Fog y={40} opacity={0.4} />
            <g fill="#2B2F3D">
              {range(9).map((i) => (
                <circle key={i} cx={56 + i * 24} cy={96 - Math.sin(i * 0.9) * 5} r={2.6} />
              ))}
            </g>
          </>
        ),
      };
    case "journey-in-the-dark":
      return {
        sky: ["#0E0C16", "#231F31"],
        body: (
          <>
            <Pillars />
            <circle cx={160} cy={74} r={5} fill="#BFE8F5" opacity="0.9" />
            <circle cx={160} cy={74} r={11} fill="#BFE8F5" opacity="0.22" />
            <rect x="0" y="100" width="320" height="10" fill="#080711" />
          </>
        ),
      };
    case "bridge-of-khazad-dum":
      return {
        sky: ["#150D12", "#33141A"],
        body: (
          <>
            <rect x="0" y="60" width="320" height="50" fill="#0C070C" />
            <path d="M0,86 Q160,52 320,86" stroke="#5B4A57" strokeWidth="7" fill="none" />
            <path d="M0,110 Q160,70 320,110" stroke="#FF6B35" strokeWidth="3" fill="none" opacity="0.5" />
            <g>
              <circle cx={160} cy={40} r={26} fill="#FF6B35" opacity="0.16" />
              <Fire x={160} y={58} s={2.4} />
            </g>
          </>
        ),
      };
    case "lothlorien":
      return {
        sky: ["#1E2A3F", "#3D4B33"],
        body: (
          <>
            <Stars n={16} seed={55} />
            <GoldCanopy />
            <g fill="#FFF1B8">
              {[58, 132, 224, 286].map((x, i) => (
                <circle key={i} cx={x} cy={60 + rnd(i + 7) * 14} r={2} opacity="0.9" />
              ))}
            </g>
          </>
        ),
      };
    case "mirror-of-galadriel":
      return {
        sky: ["#101A2E", "#27324B"],
        body: (
          <>
            <Stars n={26} seed={61} />
            <Pines y={86} n={7} h={42} fill="#13213A" seed={33} />
            <g>
              <rect x={150} y={76} width={20} height={11} rx={2.5} fill="#C9CFD8" />
              <ellipse cx={160} cy={76} rx={15} ry={4.5} fill="#EAF2FF" />
              <ellipse cx={160} cy={76} rx={9} ry={2.6} fill="#FFFFFF" opacity="0.85" />
              <circle cx={160} cy={62} r={10} fill="#EAF2FF" opacity="0.12" />
            </g>
            <g fill="#EAF2FF" opacity="0.85">
              {[96, 226].map((x, i) => (
                <g key={i}>
                  <rect x={x - 1} y={66} width={2} height={20} fill="#8B93A8" />
                  <circle cx={x} cy={63} r={3.2} />
                </g>
              ))}
            </g>
          </>
        ),
      };
    default:
      return {
        sky: ["#BFE3F2", "#F5EEC9"],
        body: (
          <>
            <Sun />
            <Hills />
          </>
        ),
      };
  }
}

export default function RegionScene({ slug, className }: { slug: string; className?: string }) {
  const { sky, body } = defs(slug);
  const gid = `sky-${slug}`;
  return (
    <svg
      viewBox="0 0 320 110"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="100%" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="320" height="110" fill={`url(#${gid})`} />
      {body}
    </svg>
  );
}

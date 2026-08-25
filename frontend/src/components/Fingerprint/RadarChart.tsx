import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface RadarChartProps {
  data: { dimension: string; score: number }[];
  color: string;
  label?: string;
}

export default function RadarChart({ data, color, label }: RadarChartProps) {
  return (
    <div className="w-full">
      {label && (
        <p className="text-xs text-[#5a6478] mb-2 tracking-widest">{label}</p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <RechartsRadar data={data}>
          <PolarGrid stroke="#2a3245" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: '#8a94a8', fontSize: 11 }} />
          <Radar
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}

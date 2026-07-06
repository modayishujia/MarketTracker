import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint {
  name: string
  value: number
}

interface Props {
  data: DataPoint[]
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B']

export function SentimentPieChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
